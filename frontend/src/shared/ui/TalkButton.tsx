import { saveComfortSettings } from "../../db/accessibility";
import { useEffect, useMemo, useRef, useState } from "react";
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
  } | null>(null);
  const language = (i18n.resolvedLanguage?.split("-")[0] ??
    "en") as VoiceLanguage;
  const playback = useRef<BrowserTextToSpeech>();
  const speech = useMemo(() => new BrowserSpeechToText(language), [language]);

  useEffect(
    () => () => {
      loop.current?.stop();
      speech.stop();
      playback.current?.cancel();
      finishConfirmation.current?.();
    },
    [speech],
  );

  const handle = async (value: string): Promise<void> => {
    const started = performance.now();
    setResponse("");
    setSource("RULE");
    setText(value);
    onRecognised?.(value);
    if (onRecognised) return;
    const profile = await activeProfile();
    if (!profile) return;
    const members = await patientRepository.getFamilyMembers();
    playback.current?.cancel();
    const tts = new BrowserTextToSpeech(
      language,
      (await getMeta("slowSpeech")) === "1",
    );
    playback.current = tts;
    const speak = tts.speak.bind(tts);
    tts.speak = async (message, options) => {
      setResponse(message);
      setPhase("speaking");
      await speak(message, options);
      setPhase("processing");
    };
    const contextual = conversation.current.resolve(value);
    if (typeof contextual === "string") {
      await tts.speak(contextual);
      return;
    }
    const languageLocked = (await getMeta("languageLocked")) === "1";
    const lockedLanguageRequest =
      languageLocked && isLanguageSwitchRequest(value);
    const command =
      contextual ??
      route(value, language, { familyMembers: members, languageLocked }) ??
      (lockedLanguageRequest ? null : await routeWithFallback(value, language));
    if (!command) {
      setError(
        t(lockedLanguageRequest ? "voice.languageLocked" : "voice.unknown"),
      );
      await tts.speak(
        t(lockedLanguageRequest ? "voice.languageLocked" : "voice.unknown"),
      );
      return;
    }
    if (command.intent === "stop_listening") {
      loop.current?.stop();
      return;
    }
    setSource(command.source ?? "RULE");
    if (import.meta.env.VITE_VOICE_DEBUG === "1")
      console.debug("smarana.voice", {
        language,
        intent: command.intent,
        confidence: command.confidence ?? 1,
        source: command.source ?? "RULE",
        parameters: command.slots,
        latencyMs: Math.round(performance.now() - started),
      });
    conversation.current.remember(command);
    let pendingConfirmation: Promise<void> | undefined;
    await performAction(command, {
      navigate,
      tts,
      routine: routineRepository,
      patientId: profile.id,
      mainText: document.querySelector("main")?.textContent ?? "",
      confirm: (message, action) => {
        pendingConfirmation = new Promise<void>((resolve) => {
          finishConfirmation.current = resolve;
        });
        setConfirmation({ message, action });
      },
      nextActivity: async () => {
        const orientation = await patientRepository.getOrientation();
        return orientation.next_activity
          ? t("voice.activityNext", { title: orientation.next_activity.title })
          : `${orientation.day}, ${orientation.date}.`;
      },
      callPerson: (name) => {
        const member = members.find((item) => item.name === name);
        if (member?.phone) window.location.href = `tel:${member.phone}`;
      },
      openSos: () =>
        window.dispatchEvent(new Event("smarana:open-sos-confirm")),
      setSlowSpeech: async (slow) => saveComfortSettings({ slow_speech: slow }),
    });
    await pendingConfirmation;
  };
  useEffect(() => {
    handler.current = handle;
  });
  const toggle = (): void => {
    if (loop.current && phase !== "idle") {
      loop.current.stop();
      playback.current?.cancel();
      return;
    }
    setOpen(true);
    setText("");
    setError("");
    window.speechSynthesis?.cancel();
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
                ? "Thinking…"
                : phase === "speaking"
                  ? "Smarana is speaking…"
                  : t("voice.heard")}
          </strong>
          {!navigator.onLine ? <p>Offline mode</p> : null}
          {text ? <p>{text}</p> : null}
          {response ? <p>{response}</p> : null}
          {source === "CLOUD_LLM" ? <p>Online assistant</p> : null}
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
              setListening(false);
              setError("");
              setPhase("processing");
              void handle(submitted)
                .catch(() => setError(t("voice.recognitionFailed")))
                .finally(() => setPhase("idle"));
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
              loop.current?.stop();
              speech.stop();
              playback.current?.cancel();
              finishConfirmation.current?.();
              setListening(false);
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
          void Promise.resolve()
            .then(() => confirmation?.action())
            .catch(() => setError(t("voice.recognitionFailed")))
            .finally(() => finishConfirmation.current?.());
          setConfirmation(null);
        }}
        onNo={() => {
          setConfirmation(null);
          finishConfirmation.current?.();
        }}
      />
    </>
  );
}
