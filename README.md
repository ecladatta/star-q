# Annotation Tool

## Overview
The Annotation Tool is a web-based application designed to facilitate the annotation of texts and tables.

## Deployment in Production

To deploy the Annotation Tool in production, follow these steps:

1. Copy `.env.example` to `.env` and update the environment variables.

2. Build and run the Docker containers:
    ```bash
    docker compose -f compose.prod.yaml up -d --build
    ```

## Development

To install and run the Annotation Tool locally, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/ecladatta/annotation-tool.git
    cd annotation-tool
    ```

2. Install dependencies:
    ```bash
    pnpm install
    ```

3. Copy `.env.example` to `.env` and update the environment variables.

4. Start the postgres server:
    ```bash
    docker compose -f compose.dev.yaml up postgres
    ```

5. Run the migrations:
    ```bash
    pnpm db:migrate
    ```

6. Start the development server:
    ```bash
    pnpm dev
    ```

7. Open your browser and navigate to `http://localhost:3000`.

## Authentication (Optional)

To enable GitHub authentication, set the following environment variables:

```bash
AUTH_ENABLED=true
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

To optionally restrict access to specific users when authentication is enabled, set:

```bash
ALLOWED_EMAILS=user1@example.com,user2@example.com
```

## Deployment in Production

To deploy the Annotation Tool in production, follow these steps:

1. Copy `.env.example` to `.env` and update the environment variables.

2. Build and run the Docker containers:
    ```bash
    docker compose -f compose.prod.yaml up -d --build
    ```
