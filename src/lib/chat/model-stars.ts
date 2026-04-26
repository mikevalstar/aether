import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const starredModelsAtom = atomWithStorage<string[]>("aether.chat.starredModels", []);

export const starredModelSetAtom = atom((get) => new Set(get(starredModelsAtom)));

export function useStarredModels() {
  const [stars, setStars] = useAtom(starredModelsAtom);
  const set = new Set(stars);
  function toggle(modelId: string) {
    setStars((prev) => (prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]));
  }
  function isStarred(modelId: string) {
    return set.has(modelId);
  }
  return { stars, isStarred, toggle };
}
