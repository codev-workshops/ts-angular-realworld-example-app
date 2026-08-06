/** Angular DefaultImagePipe equivalent. */
export function defaultImage(image: string | null | undefined): string {
  return image || '/assets/images/default-avatar.svg';
}
