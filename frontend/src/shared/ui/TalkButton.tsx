import { saveComfortSettings } from "../../db/accessibility";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { patientRepository } from "../../db/repo/patient";
import { routineRepository } from "../../db/repo/routine";
import { activeProfile, getMeta } from "../../db/schema";
import { performAction } from "../../voice/actions";
import { routeWithFallback } from "../../voice/fallback";
import { isLanguageSwitchRequest, route } from "../../voice/router";
import { BrowserSpeechToText, type VoiceLanguage } from "../../voice/stt";
import { BrowserTextToSpeech } from "../../voice/tts";
import { ConfirmDialog } from "./ConfirmDialog";
import { VoiceConversation } from "../../voice/conversation";
import { VoiceLoop, type VoiceState } from "../../voice/loop";
import { TurnManager, type VoiceTurn } from "../../voice/turn";
import { normalizeTranscript } from "../../voice/safety";
import { cancelSpeech } from "../hooks/useTts";

export function TalkButton({
  onRecognised,
}: {
  onRecognised?: (text: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<VoiceState>("idle");
  const loop = useRef<VoiceLoop>();
  const turns = useRef(new TurnManager());
  const mounted = useRef(true);
  const lastResponse = useRef("");
  const conversation = useRef(new VoiceConversation());
  const finishConfirmation = useRef<() => void>();
  const handler = useRef<(value: string) => Promise<void>>();
  const [text, setText] = useState("");
  const [response, setResponse] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [request, setRequest] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    message: string;
    action: () => void | Promise<void>;
    turn: VoiceTurn;
    finish: () => void;
  } | null>(null);
  const language = (i18n.resolvedLanguage?.split("-")[0] ??
    "en") as VoiceLanguage;
  const playback = useRef<BrowserTextToSpeech>();
  const speech = useMemo(() => new BrowserSpeechToText(language), [language]);

  const cancel = useCallback(
    (reset = true): void => {
      turns.current.cancel();
      loop.current?.stop();
      speech.stop();
      playback.current?.cancel();
      finishConfirmation.current?.();
      finishConfirmation.current = undefined;
      if (reset) {
        conversation.current.reset();
        lastResponse.current = "";
      }
      if (mounted.current) {
        setConfirmation(null);
        setPhase("idle");
        setListening(false);
      }
    },
    [speech],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel();
    };
  }, [cancel]);

  // Speech and typed submissions enter this exact same turn/abort pipeline.
  const handle = async (value: string): Promise<void> => {
    finishConfirmation.current?.();
    playback.current?.cancel();
    const turn = turns.current.begin();
    setConfirmation(null);
    setError("");
    setResponse("");
    setSource("RULE");
    setText(value);
    setPhase("processing");
    onRecognised?.(value);
    if (onRecognised) return;
    let tts: BrowserTextToSpeech | undefined;
    try {
      const profile = await turn.wait(activeProfile());
      if (!profile) throw new Error("Patient profile unavailable");
      const members = /\b(?:call|phone)\b|ফোন|কল|फ़ोन|कॉल/u.test(
        normalizeTranscript(value),
      )
        ? await turn.wait(patientRepository.getFamilyMembers(turn.signal))
        : [];
      const slow = await turn.wait(getMeta("slowSpeech"));
      turn.assertActive();
      tts = new BrowserTextToSpeech(language, slow === "1");
      playback.current = tts;
      const speak = tts.speak.bind(tts);
      tts.speak = async (message, options) => {
        turn.assertActive();
        lastResponse.current = message;
        setResponse(message);
        setPhase("speaking");
        await turn.wait(speak(message, options));
        turn.assertActive();
        setPhase("processing");
      };
      const contextual = conversation.current.resolve(value);
      if (typeof contextual === "string") {
        await tts.speak(contextual);
        return;
      }
      const languageLocked =
        (await turn.wait(getMeta("languageLocked"))) === "1";
      const lockedLanguageRequest =
        languageLocked && isLanguageSwitchRequest(value);
      let command =
        contextual ??
        route(value, language, { familyMembers: members, languageLocked });
      if (command?.intent === "general_chat" && !command.slots.response) {
        command = await turn.wait(
          routeWithFallback(value, language, turn.signal),
        );
        turn.assertActive();
        if (!command) {
          await tts.speak(t("voice.assistantUnavailable"));
          return;
        }
      }
      turn.assertActive();
      if (!command) {
        const message = lockedLanguageRequest
          ? t("voice.languageLocked")
          : /\b(?:play|start)\s+\S|\bopen\b.*\bgame\b/i.test(value)
            ? t("voice.gameNotFound")
            : t("voice.unknown");
        setError(message);
        await tts.speak(message);
        return;
      }
      if (command.intent === "stop_listening") {
        cancel();
        return;
      }
      if (command.intent === "repeat") {
        await tts.speak(lastResponse.current || t("voice.nothingToRepeat"));
        return;
      }
      if (command.intent === "cancel") {
        conversation.current.reset();
        await tts.speak(t("voice.cancelled"));
        return;
      }
      setSource(command.source ?? "RULE");
      if (import.meta.env.DEV && import.meta.env.VITE_VOICE_DEBUG === "1")
        console.debug("smarana.voice", {
          turnId: turn.id,
          intent: command.intent,
          source: command.source ?? "RULE",
        });
      conversation.current.remember(command);
      let pendingConfirmation: Promise<void> | undefined;
      await turn.wait(
        performAction(command, {
          navigate,
          tts,
          patientId: profile.id,
          routine: {
            getToday: () => {
              turn.assertActive();
              return routineRepository.getToday(turn.signal);
            },
            getMedications: () => {
              turn.assertActive();
              return routineRepository.getMedications(turn.signal);
            },
            respond: routineRepository.respond.bind(routineRepository),
          },
          isActive: turn.isActive,
          signal: turn.signal,
          mainText: document.querySelector("main")?.textContent ?? "",
          confirm: (message, action) => {
            turn.assertActive();
            pendingConfirmation = new Promise<void>((resolve) => {
              const finish = () => {
                turn.signal.removeEventListener("abort", abort);
                if (finishConfirmation.current === finish)
                  finishConfirmation.current = undefined;
                resolve();
              };
              const abort = () => {
                if (mounted.current) setConfirmation(null);
                finish();
              };
              finishConfirmation.current = finish;
              turn.signal.addEventListener("abort", abort, { once: true });
              setConfirmation({
                message,
                turn,
                finish,
                action: async () => {
                  turn.assertActive();
                  await action();
                  turn.assertActive();
                },
              });
            });
          },
          nextActivity: async () => {
            turn.assertActive();
            const orientation = await turn.wait(
              patientRepository.getOrientation(turn.signal),
            );
            return orientation.next_activity
              ? t("voice.activityNext", {
                  title: orientation.next_activity.title,
                })
              : orientation.day + ", " + orientation.date + ".";
          },
          callPerson: (name) => {
            turn.assertActive();
            const member = members.find((item) => item.name === name);
            if (member?.phone) window.location.href = "tel:" + member.phone;
          },
          openSos: () => {
            turn.assertActive();
            window.dispatchEvent(new Event("smarana:open-sos-confirm"));
          },
          setSlowSpeech: async (slow) => {
            turn.assertActive();
            await turn.wait(saveComfortSettings({ slow_speech: slow }));
            tts?.setSlow(slow);
          },
        }),
      );
      if (pendingConfirmation) await turn.wait(pendingConfirmation);
    } catch (error) {
      if (
        turn.isActive() &&
        mounted.current &&
        !(error instanceof DOMException && error.name === "AbortError")
      )
        setError(t("voice.requestFailed"));
    } finally {
      if (turn.isActive() && mounted.current) setPhase("idle");
    }
  };
  useEffect(() => {
    handler.current = handle;
  });
  const toggle = (): void => {
    if (
      loop.current?.isRunning() ||
      phase === "processing" ||
      phase === "speaking"
    ) {
      cancel();
      return;
    }
    setOpen(true);
    setText("");
    setError("");
    cancelSpeech();
    loop.current = new VoiceLoop(
      speech,
      async (value) => {
        await handler.current?.(value);
      },
      (state) => {
        setPhase(state);
        setListening(state === "listening");
      },
      (code) =>
        setError(
          t(
            code === "unsupported"
              ? "voice.unsupported"
              : code === "not-allowed" || code === "service-not-allowed"
                ? "voice.permissionDenied"
                : "voice.recognitionFailed",
          ),
        ),
    );
    loop.current.start();
  };
  return (
    <>
      <button
        aria-pressed={listening}
        className={`min-h-touch justify-self-end rounded-card px-2 font-bold ${listening ? "animate-pulse bg-primary text-white" : ""}`}
        type="button"
        onClick={toggle}
      >
        ◖)) {t("patient.talk")}
      </button>
      {open ? (
        <div
          className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-lg rounded-card bg-surface p-5 shadow-card"
          role="status"
        >
          <strong>
            {listening
              ? t("voice.listening")
              : phase === "processing"
                ? t("voice.thinking")
                : phase === "speaking"
                  ? t("voice.speaking")
                  : t("voice.heard")}
          </strong>
          {!navigator.onLine ? <p>{t("voice.offline")}</p> : null}
          <p className="text-sm">{t("voice.providerNotice")}</p>
          {text ? <p>{text}</p> : null}
          {response ? <p>{response}</p> : null}
          {source === "CLOUD_LLM" ? <p>{t("voice.onlineAssistant")}</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const entry = new FormData(event.currentTarget).get("request");
              const submitted = typeof entry === "string" ? entry.trim() : "";
              if (!submitted) return;
              loop.current?.stop();
              speech.stop();
              void handle(submitted);
              setRequest("");
            }}
          >
            <input
              name="request"
              aria-label={t("voice.request")}
              className="min-h-touch min-w-0 flex-1 rounded-card border p-2"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
            />
            <button
              className="min-h-touch rounded-card bg-primary px-4 text-primaryText"
              type="submit"
            >
              {t("voice.send")}
            </button>
          </form>
          <button
            className="mt-2 min-h-touch underline"
            type="button"
            onClick={() => {
              cancel();
              setOpen(false);
            }}
          >
            {t("auth.back")}
          </button>
        </div>
      ) : null}
      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.message ?? ""}
        yesLabel={t("common.yes")}
        noLabel={t("common.no")}
        ttsLabel={t("patient.listen")}
        onYes={() => {
          const current = confirmation;
          setConfirmation(null);
          if (!current?.turn.isActive()) {
            current?.finish();
            return;
          }
          void Promise.resolve()
            .then(() => current.action())
            .catch(() => {
              if (current.turn.isActive()) setError(t("voice.requestFailed"));
            })
            .finally(current.finish);
        }}
        onNo={() => {
          const current = confirmation;
          setConfirmation(null);
          current?.finish();
          turns.current.cancel();
          setPhase("idle");
        }}
      />
    </>
  );
}
