import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { favourites, toggleFavourite, type Favourite } from "./favourites";
export function FavouriteButton({ kind, id }: Favourite) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    void favourites()
      .then((items) =>
        setSaved(items.some((item) => item.kind === kind && item.id === id)),
      )
      .catch(() => undefined);
  }, [kind, id]);
  return (
    <button
      type="button"
      aria-pressed={saved}
      className="min-h-touch rounded-card border-2 border-primary p-4"
      onClick={() =>
        void toggleFavourite({ kind, id })
          .then(() => favourites())
          .then((items) =>
            setSaved(
              items.some((item) => item.kind === kind && item.id === id),
            ),
          )
      }
    >
      {t(saved ? "newGames.saved" : "newGames.save")}
    </button>
  );
}
