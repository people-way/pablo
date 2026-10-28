"use client";

import type { TreeNode } from "@/lib/openings/repertoire-types";
import { formatRecord } from "@/lib/openings/line-format";

export function LineTree({
  nodes,
  open,
  activeId,
  onToggle,
  onReplay,
}: {
  nodes: TreeNode[];
  open: Set<string>;
  activeId: string | null;
  onToggle: (id: string) => void;
  onReplay: (node: TreeNode) => void;
}) {
  if (nodes.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Pas assez de parties avec cette couleur sur la période.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((node) => (
        <LineRow key={node.id} node={node} depth={0} open={open} activeId={activeId} onToggle={onToggle} onReplay={onReplay} />
      ))}
    </ul>
  );
}

function LineRow({
  node,
  depth,
  open,
  activeId,
  onToggle,
  onReplay,
}: {
  node: TreeNode;
  depth: number;
  open: Set<string>;
  activeId: string | null;
  onToggle: (id: string) => void;
  onReplay: (node: TreeNode) => void;
}) {
  const expanded = open.has(node.id);
  const active = node.id === activeId;
  const named = node.openingName !== "Ouverture non identifiée" && node.ply >= 4;
  const title = named
    ? node.variation
      ? `${node.openingName} · ${node.variation}`
      : node.openingName
    : null;

  return (
    <li>
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5"
        style={{
          marginLeft: depth * 12,
          background: active ? "rgba(201,168,76,0.1)" : "transparent",
          border: active ? "1px solid var(--border-gold)" : "1px solid transparent",
        }}
      >
        {node.children.length > 0 ? (
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md text-sm"
            aria-expanded={expanded}
            aria-label={expanded ? "Replier la ligne" : "Déplier la ligne"}
            style={{ color: "var(--gold)" }}
            onClick={() => onToggle(node.id)}
          >
            {expanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
            ·
          </span>
        )}
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {node.san}
        </span>
        <span className="text-sm" style={{ color: scoreColor(node.stats.scorePct) }}>
          {node.stats.games} · {node.stats.scorePct}%
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {formatRecord(node.stats.wins, node.stats.draws, node.stats.losses)}
          {node.stats.avgAccuracy != null ? ` · précision ${node.stats.avgAccuracy}%` : ""}
        </span>
        {title ? (
          <span className="text-xs" style={{ color: "var(--gold)" }}>
            {title}
          </span>
        ) : null}
        {node.byUser && node.userExits >= 2 ? <Badge>sortie de théorie</Badge> : null}
        {!node.byUser && node.opponentExits >= 2 ? <Badge>réponse adverse</Badge> : null}
        {node.inBookShare >= 0.7 && node.userExits < 2 ? <Badge>théorie</Badge> : null}
        {node.ply >= 4 ? (
          <button type="button" className="min-h-11 rounded-md px-2 text-xs font-semibold" style={{ color: "var(--gold-light)" }} onClick={() => onReplay(node)}>
            Rejouer
          </button>
        ) : null}
      </div>
      {node.rareGames > 0 && expanded ? (
        <p className="text-xs" style={{ marginLeft: (depth + 1) * 12 + 44, color: "var(--text-muted)" }}>
          + {node.rareGames} parties dans des suites plus rares
        </p>
      ) : null}
      {expanded && node.children.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {node.children.map((child) => (
            <LineRow
              key={child.id}
              node={child}
              depth={depth + 1}
              open={open}
              activeId={activeId}
              onToggle={onToggle}
              onReplay={onReplay}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
      style={{ color: "var(--gold)", border: "1px solid var(--border-gold)" }}
    >
      {children}
    </span>
  );
}

function scoreColor(score: number) {
  if (score < 40) return "#ff7070";
  if (score < 50) return "#e8a84c";
  return "#8ce0ac";
}
