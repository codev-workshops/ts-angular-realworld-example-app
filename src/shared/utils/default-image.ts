/** Port of the `defaultImage` pipe (`src/app/shared/pipes/default-image.pipe.ts`). */
export function defaultImage(image: string | null | undefined): string {
  return image || '/assets/images/default-avatar.svg';
}
