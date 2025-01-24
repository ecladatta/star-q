# Annotation Tool

## Overview
The Annotation Tool is a web-based application designed to facilitate the annotation of texts and tables.

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

4. Start the development server:
    ```bash
    pnpm dev
    ```

4. Open your browser and navigate to `http://localhost:3000`.

## Deployment in Production

To deploy the Annotation Tool in production, follow these steps:

1. Copy `.env.example` to `.env` and update the environment variables.

2. Build and run the Docker containers:
    ```bash
    docker compose -f compose.prod.yaml up -d --build
    ```
