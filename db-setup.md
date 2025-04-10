# PostgreSQL Setup for CloutNest

This project now uses PostgreSQL instead of MongoDB. Follow these steps to set up your local environment.

## Option 1: Install PostgreSQL locally

### macOS (using Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create the database
createdb CloutNest
```

### Windows
1. Download and install PostgreSQL from [the official website](https://www.postgresql.org/download/windows/)
2. During installation, set password to 'postgres' for user 'postgres'
3. After installation, open pgAdmin 4 and create a new database named 'CloutNest'

### Linux (Ubuntu/Debian)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user and create the database
sudo -i -u postgres
createdb CloutNest
```

## Option 2: Using Docker

If you have Docker installed and running:

```bash
# Start PostgreSQL container
docker run --name CloutNest-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=CloutNest -p 5432:5432 -d postgres:14

# To stop the container
docker stop CloutNest-postgres

# To start it again later
docker start CloutNest-postgres
```

## Verify the connection

After setting up PostgreSQL, run the following command to push the schema to your database:

```bash
npx prisma db push
```

Then run the development server:

```bash
npm run dev
```

## Updating your .env file

Make sure your `.env` file contains the correct DATABASE_URL:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/CloutNest?schema=public"
```

Adjust the username, password, or host as needed based on your setup. 