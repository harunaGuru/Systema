import type { Edge, Node } from "@xyflow/react"
import type { SystemaEdgeData } from "@/components/editor/canvas/edge"
import type {
  ShapeType,
  SystemaNodeData,
} from "@/components/editor/canvas/shapes"

export interface StarterTemplate {
  id: string
  name: string
  description: string
  data: {
    nodes: Node<SystemaNodeData, ShapeType>[]
    edges: Edge<SystemaEdgeData>[]
  }
}

export const starterTemplates: StarterTemplate[] = [
  {
    id: "monolith",
    name: "Monolith",
    description: "A highly available monolithic application with caching, replicated storage, and asynchronous workers.",
    data: {
      nodes: [
        { id: "client", type: "circle", position: { x: 80, y: 300 }, data: { name: "Web and Mobile Clients", description: "", color: "slate" } },
        { id: "load-balancer", type: "rectangle", position: { x: 340, y: 300 }, data: { name: "Load Balancer", description: "", color: "slate" } },
        { id: "app-server-1", type: "rectangle", position: { x: 620, y: 160 }, data: { name: "App Server 1", description: "", color: "slate" } },
        { id: "app-server-2", type: "rectangle", position: { x: 620, y: 440 }, data: { name: "App Server 2", description: "", color: "slate" } },
        { id: "redis-cache", type: "cylinder", position: { x: 900, y: 20 }, data: { name: "Redis Cache", description: "", color: "slate" } },
        { id: "primary-database", type: "cylinder", position: { x: 900, y: 300 }, data: { name: "Primary Database", description: "", color: "slate" } },
        { id: "read-replica", type: "cylinder", position: { x: 1180, y: 300 }, data: { name: "Read Replica", description: "", color: "slate" } },
        { id: "message-queue", type: "hexagon", position: { x: 900, y: 580 }, data: { name: "RabbitMQ Job Queue", description: "", color: "slate" } },
        { id: "background-worker", type: "rectangle", position: { x: 1180, y: 580 }, data: { name: "Background Worker", description: "", color: "slate" } },
      ],
      edges: [
        { id: "client-to-load-balancer", source: "client", target: "load-balancer", data: { name: "HTTPS requests", description: "" } },
        { id: "load-balancer-to-app-1", source: "load-balancer", target: "app-server-1", data: { name: "Route traffic", description: "" } },
        { id: "load-balancer-to-app-2", source: "load-balancer", target: "app-server-2", data: { name: "Route traffic", description: "" } },
        { id: "app-1-to-cache", source: "app-server-1", target: "redis-cache", data: { name: "Cache reads and writes", description: "" } },
        { id: "app-2-to-cache", source: "app-server-2", target: "redis-cache", data: { name: "Cache reads and writes", description: "" } },
        { id: "app-1-to-primary", source: "app-server-1", target: "primary-database", data: { name: "Read and write", description: "" } },
        { id: "app-2-to-primary", source: "app-server-2", target: "primary-database", data: { name: "Read and write", description: "" } },
        { id: "primary-to-replica", source: "primary-database", target: "read-replica", data: { name: "Replication", description: "" } },
        { id: "app-1-to-queue", source: "app-server-1", target: "message-queue", data: { name: "Publish async jobs", description: "" } },
        { id: "app-2-to-queue", source: "app-server-2", target: "message-queue", data: { name: "Publish async jobs", description: "" } },
        { id: "queue-to-worker", source: "message-queue", target: "background-worker", data: { name: "Consume jobs", description: "" } },
        { id: "worker-to-primary", source: "background-worker", target: "primary-database", data: { name: "Persist job results", description: "" } },
      ],
    },
  },
  {
    id: "microservices",
    name: "Microservices",
    description: "An API gateway routes to independently deployed services with private data stores and asynchronous integration.",
    data: {
      nodes: [
        { id: "client", type: "circle", position: { x: 80, y: 360 }, data: { name: "Web and Mobile Clients", description: "", color: "slate" } },
        { id: "api-gateway", type: "rectangle", position: { x: 340, y: 360 }, data: { name: "API Gateway", description: "", color: "slate" } },
        { id: "auth-service", type: "rectangle", position: { x: 620, y: 40 }, data: { name: "Auth Service", description: "", color: "slate" } },
        { id: "user-service", type: "rectangle", position: { x: 620, y: 220 }, data: { name: "User Service", description: "", color: "slate" } },
        { id: "order-service", type: "rectangle", position: { x: 620, y: 400 }, data: { name: "Order Service", description: "", color: "slate" } },
        { id: "notification-service", type: "rectangle", position: { x: 620, y: 580 }, data: { name: "Notification Service", description: "", color: "slate" } },
        { id: "service-registry", type: "rectangle", position: { x: 900, y: 40 }, data: { name: "Service Registry", description: "", color: "slate" } },
        { id: "user-database", type: "cylinder", position: { x: 900, y: 220 }, data: { name: "User Database", description: "", color: "slate" } },
        { id: "order-database", type: "cylinder", position: { x: 900, y: 400 }, data: { name: "Order Database", description: "", color: "slate" } },
        { id: "event-queue", type: "hexagon", position: { x: 900, y: 580 }, data: { name: "Service Event Queue", description: "", color: "slate" } },
        { id: "email-provider", type: "pill", position: { x: 1180, y: 580 }, data: { name: "Email and SMS Provider", description: "", color: "slate" } },
      ],
      edges: [
        { id: "client-to-gateway", source: "client", target: "api-gateway", data: { name: "API requests", description: "" } },
        { id: "gateway-to-auth", source: "api-gateway", target: "auth-service", data: { name: "Authenticate requests", description: "" } },
        { id: "gateway-to-users", source: "api-gateway", target: "user-service", data: { name: "User routes", description: "" } },
        { id: "gateway-to-orders", source: "api-gateway", target: "order-service", data: { name: "Order routes", description: "" } },
        { id: "gateway-to-notifications", source: "api-gateway", target: "notification-service", data: { name: "Notification routes", description: "" } },
        { id: "auth-to-users", source: "auth-service", target: "user-service", data: { name: "Validate identity", description: "" } },
        { id: "users-to-db", source: "user-service", target: "user-database", data: { name: "User data", description: "" } },
        { id: "orders-to-db", source: "order-service", target: "order-database", data: { name: "Order data", description: "" } },
        { id: "orders-to-queue", source: "order-service", target: "event-queue", data: { name: "Publish order events", description: "" } },
        { id: "queue-to-notifications", source: "event-queue", target: "notification-service", data: { name: "Deliver events", description: "" } },
        { id: "notifications-to-provider", source: "notification-service", target: "email-provider", data: { name: "Send notifications", description: "" } },
        { id: "auth-to-registry", source: "auth-service", target: "service-registry", data: { name: "Service discovery", description: "" } },
        { id: "users-to-registry", source: "user-service", target: "service-registry", data: { name: "Service discovery", description: "" } },
        { id: "orders-to-registry", source: "order-service", target: "service-registry", data: { name: "Service discovery", description: "" } },
      ],
    },
  },
  {
    id: "event-driven",
    name: "Event-Driven",
    description: "A schema-governed Kafka event stream fans out to independent consumers and purpose-built data stores.",
    data: {
      nodes: [
        { id: "source-system", type: "pill", position: { x: 80, y: 320 }, data: { name: "Source System", description: "", color: "slate" } },
        { id: "producer", type: "rectangle", position: { x: 340, y: 320 }, data: { name: "Event Producer", description: "", color: "slate" } },
        { id: "schema-registry", type: "rectangle", position: { x: 620, y: 40 }, data: { name: "Schema Registry", description: "", color: "slate" } },
        { id: "event-bus", type: "hexagon", position: { x: 620, y: 320 }, data: { name: "Kafka Event Bus", description: "", color: "slate" } },
        { id: "search-consumer", type: "rectangle", position: { x: 900, y: 40 }, data: { name: "Search Index Consumer", description: "", color: "slate" } },
        { id: "analytics-consumer", type: "rectangle", position: { x: 900, y: 320 }, data: { name: "Analytics Consumer", description: "", color: "slate" } },
        { id: "notification-consumer", type: "rectangle", position: { x: 900, y: 600 }, data: { name: "Notification Consumer", description: "", color: "slate" } },
        { id: "elasticsearch", type: "cylinder", position: { x: 1180, y: 40 }, data: { name: "Elasticsearch Index", description: "", color: "slate" } },
        { id: "data-warehouse", type: "cylinder", position: { x: 1180, y: 320 }, data: { name: "Data Warehouse", description: "", color: "slate" } },
        { id: "notification-store", type: "cylinder", position: { x: 1180, y: 600 }, data: { name: "Notification Store", description: "", color: "slate" } },
      ],
      edges: [
        { id: "source-to-producer", source: "source-system", target: "producer", data: { name: "Business changes", description: "" } },
        { id: "producer-to-schema", source: "producer", target: "schema-registry", data: { name: "Register and validate schema", description: "" } },
        { id: "producer-to-bus", source: "producer", target: "event-bus", data: { name: "Publish events", description: "" } },
        { id: "bus-to-search", source: "event-bus", target: "search-consumer", data: { name: "Search topic", description: "" } },
        { id: "bus-to-analytics", source: "event-bus", target: "analytics-consumer", data: { name: "Analytics topic", description: "" } },
        { id: "bus-to-notifications", source: "event-bus", target: "notification-consumer", data: { name: "Notification topic", description: "" } },
        { id: "search-to-elasticsearch", source: "search-consumer", target: "elasticsearch", data: { name: "Update search index", description: "" } },
        { id: "analytics-to-warehouse", source: "analytics-consumer", target: "data-warehouse", data: { name: "Load analytics data", description: "" } },
        { id: "notifications-to-store", source: "notification-consumer", target: "notification-store", data: { name: "Persist delivery state", description: "" } },
      ],
    },
  },
  {
    id: "serverless",
    name: "Serverless",
    description: "An authenticated, event-driven order flow built from managed cloud services and Lambda functions.",
    data: {
      nodes: [
        { id: "client", type: "circle", position: { x: 80, y: 320 }, data: { name: "Web and Mobile Clients", description: "", color: "slate" } },
        { id: "api-gateway", type: "rectangle", position: { x: 340, y: 320 }, data: { name: "API Gateway", description: "", color: "slate" } },
        { id: "cognito", type: "pill", position: { x: 340, y: 40 }, data: { name: "Cognito Auth Provider", description: "", color: "slate" } },
        { id: "create-order", type: "rectangle", position: { x: 620, y: 220 }, data: { name: "CreateOrder Lambda", description: "", color: "slate" } },
        { id: "process-payment", type: "rectangle", position: { x: 900, y: 220 }, data: { name: "ProcessPayment Lambda", description: "", color: "slate" } },
        { id: "persist-order", type: "rectangle", position: { x: 620, y: 500 }, data: { name: "PersistOrder Lambda", description: "", color: "slate" } },
        { id: "dynamodb", type: "cylinder", position: { x: 900, y: 500 }, data: { name: "DynamoDB Orders", description: "", color: "slate" } },
        { id: "s3-bucket", type: "cylinder", position: { x: 1180, y: 500 }, data: { name: "S3 Receipts Bucket", description: "", color: "slate" } },
        { id: "sns-topic", type: "hexagon", position: { x: 1180, y: 220 }, data: { name: "SNS Notifications Topic", description: "", color: "slate" } },
        { id: "notification-lambda", type: "rectangle", position: { x: 1460, y: 220 }, data: { name: "SendNotification Lambda", description: "", color: "slate" } },
        { id: "email-provider", type: "pill", position: { x: 1740, y: 220 }, data: { name: "Email and SMS Provider", description: "", color: "slate" } },
      ],
      edges: [
        { id: "client-to-gateway", source: "client", target: "api-gateway", data: { name: "HTTPS requests", description: "" } },
        { id: "client-to-cognito", source: "client", target: "cognito", data: { name: "Sign in and obtain token", description: "" } },
        { id: "cognito-to-gateway", source: "cognito", target: "api-gateway", data: { name: "JWT authorizer", description: "" } },
        { id: "gateway-to-create-order", source: "api-gateway", target: "create-order", data: { name: "Create order request", description: "" } },
        { id: "create-to-payment", source: "create-order", target: "process-payment", data: { name: "Initiate payment", description: "" } },
        { id: "payment-to-persist", source: "process-payment", target: "persist-order", data: { name: "Payment result", description: "" } },
        { id: "persist-to-dynamodb", source: "persist-order", target: "dynamodb", data: { name: "Store order", description: "" } },
        { id: "create-to-s3", source: "create-order", target: "s3-bucket", data: { name: "Store receipt", description: "" } },
        { id: "create-to-sns", source: "create-order", target: "sns-topic", data: { name: "Publish order event", description: "" } },
        { id: "sns-to-notification", source: "sns-topic", target: "notification-lambda", data: { name: "Trigger notification", description: "" } },
        { id: "notification-to-provider", source: "notification-lambda", target: "email-provider", data: { name: "Deliver email or SMS", description: "" } },
      ],
    },
  },
]
