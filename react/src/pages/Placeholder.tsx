/**
 * Temporary stand-in for a page that has not been migrated yet.
 * Removed as each feature slice lands.
 */
export function Placeholder({ name }: { name: string }) {
  return (
    <div className="container page">
      <h1>{name}</h1>
      <p>Not migrated yet.</p>
    </div>
  );
}
