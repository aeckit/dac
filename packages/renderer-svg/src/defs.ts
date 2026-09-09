export function getDefs(): string {
  return `
    <defs>
      <pattern id="concrete-hatch" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="15" r="1" fill="#475569"/>
        <circle cx="45" cy="20" r="1.5" fill="#475569"/>
        <circle cx="20" cy="45" r="1" fill="#475569"/>
        <circle cx="50" cy="50" r="1" fill="#475569"/>
        <path d="M 5,35 L 12,32 L 8,40 Z" class="concrete-aggregate" fill="none" stroke="#64748b" stroke-width="1.5" />
        <path d="M 35,10 L 42,15 L 33,18 Z" class="concrete-aggregate" fill="none" stroke="#64748b" stroke-width="1.5" />
        <path d="M 40,40 L 48,35 L 45,45 Z" class="concrete-aggregate" fill="none" stroke="#64748b" stroke-width="1.5" />
      </pattern>
      <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" class="dimension-arrow" fill="#06b6d4" />
      </marker>
      <marker id="origin-arrow-x" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" fill="#f43f5e" />
      </marker>
      <marker id="origin-arrow-y" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 2 L 10 5 L 0 8 z" fill="#38bdf8" />
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
