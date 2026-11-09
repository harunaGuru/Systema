import type { Edge, Node } from "@xyflow/react"
import type { LiveblocksFlow } from "@liveblocks/react-flow"
import type { SystemaEdgeData } from "@/components/editor/canvas/edge"
import type {
  ShapeType,
  SystemaNodeData,
} from "@/components/editor/canvas/shapes"

type SystemaFlowNode = Node<SystemaNodeData, ShapeType>
type SystemaFlowEdge = Edge<SystemaEdgeData>

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null
      action: "typing" | "connecting" | null
      selection: { nodeIds: string[]; edgeIds: string[] }
    }
    Storage: {
      flow?: LiveblocksFlow<SystemaFlowNode, SystemaFlowEdge>
    }
    UserMeta: {
      id: string
      info: { name: string; color: string }
    }
    ThreadMetadata: Record<string, never>
  }
}

export {}
