"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Plus } from "lucide-react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

export type SystemaEdgeData = {
  name: string;
  description: string;
};

type SystemaEdgeType = Edge<SystemaEdgeData>;

export function SystemaEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
}: EdgeProps<SystemaEdgeType>) {
  const { updateEdgeData, setEdges, setNodes } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(data?.name ?? "");
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const hasName = Boolean(data?.name);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  function startEditing(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    beginEditing();
  }

  function beginEditing() {
    setNameDraft(data?.name ?? "");
    setIsEditing(true);
  }

  function saveName() {
    updateEdgeData(id, { name: nameDraft.trim() });
    setIsEditing(false);
  }

  function selectEdge(event: { stopPropagation: () => void }) {
    event.stopPropagation();
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({ ...node, selected: false })),
    );
    setEdges((currentEdges) =>
      currentEdges.map((edge) => ({ ...edge, selected: edge.id === id })),
    );
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={20}
        style={{
          stroke: selected
            ? "var(--color-accent-primary)"
            : "var(--color-border-default)",
          strokeWidth: 2.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`nodrag nopan absolute flex min-h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated px-2 py-1 font-mono text-xs text-text-primary ${
            hasName || isEditing ? "rounded-sm" : "cursor-text"
          }`}
          style={{
            left: labelX,
            top: labelY,
            pointerEvents: "all",
          }}
          role="button"
          tabIndex={0}
          aria-label={data?.name ? `Select edge ${data.name}` : "Select edge"}
          onClick={selectEdge}
          onDoubleClick={startEditing}
          onKeyDown={(event) => {
            if (event.key === " " && !isEditing) {
              event.preventDefault();
              selectEdge(event);
              return;
            }
            if (event.key === "Enter" && !isEditing) {
              event.preventDefault();
              beginEditing();
            }
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              aria-label="Edge name"
              className="nodrag nopan w-full min-w-16 bg-transparent text-center font-mono text-xs text-text-primary outline-none"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={saveName}
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
          ) : hasName ? (
            data?.name
          ) : (
            <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-text-muted">
              <Plus aria-hidden="true" className="h-3 w-3" />
              {/* Add name */}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
