

Backend Microservices (Spring Boot 3, Java 21)
Each service packaged in a Docker container, deployed in Kubernetes:

    User Service – Auth, profile, JWT management (via Supabase or Spring Security)

    Transaction Service – CSV import, data validation, categorization

    Budget Service – Budget CRUD, tracking, alerts

    Analytics Service – Trend analysis, aggregates (consumes Kafka stream)

    AI Categorization Service (Python FastAPI) – ML‑based merchant classification

