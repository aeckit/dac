export function getDefs(): string {
  return `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" class="dimension-arrow" fill="currentColor" />
      </marker>
      <marker id="origin-arrow-x" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--cad-origin-x)" />
      </marker>
      <marker id="origin-arrow-y" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--cad-origin-y)" />
      </marker>
      <filter id="hover-text-bg" x="-2%" y="-5%" width="104%" height="110%">
        <feFlood flood-color="rgba(148, 163, 184, 0.2)" result="bg" />
        <feMerge>
          <feMergeNode in="bg" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;
}
