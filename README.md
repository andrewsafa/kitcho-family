# Kitcho Family Loyalty Program

A comprehensive loyalty program management platform enabling secure partner authentication and customer verification through a streamlined ecosystem.

## Features

- Customer registration and loyalty points tracking
- Dynamic verification code generation for enhanced security
- Partner authentication system
- Administrative dashboard for program management
- Special offers and event management
- Loyalty level benefits administration
- Points transaction history
- Mobile-responsive design

## Tech Stack

- Frontend: React.js with TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL with Drizzle ORM
- UI Components: shadcn/ui
- State Management: TanStack Query (React Query)
- Styling: Tailwind CSS
- Form Handling: React Hook Form + Zod validation

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Git

### Installation

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/kitcho-family.git
cd kitcho-family
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/kitcho_family
NODE_ENV=development
SESSION_SECRET=your-secure-session-secret
```

4. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Application environment (development/production)
- `SESSION_SECRET`: Secret for session management
- `PORT`: Server port (defaults to 5000)

## Project Structure

```
kitcho-family/
├── client/             # Frontend React application
│   ├── src/
│   │   ├── components/ # Reusable React components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utility functions
│   │   └── pages/     # Page components
├── server/            # Backend Express server
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Database operations
│   └── auth.ts       # Authentication logic
├── shared/           # Shared types and schemas
└── public/           # Static assets
```

## Key Features

### Customer Management
- Registration and profile management
- Points tracking and transaction history
- Loyalty level progression
- Verification code system

### Partner Portal
- Secure authentication
- Customer verification
- Transaction processing
- Status checking

### Administrative Dashboard
- Customer management
- Partner management
- Special offers creation
- Level benefits configuration
- System backup and restore

## Deployment

### GitHub Deployment
1. Create a new repository on GitHub
2. Add the remote repository:
```bash
git remote add origin https://github.com/YOUR_USERNAME/kitcho-family.git
```
3. Push your code:
```bash
git push -u origin main
```

### Production Deployment Options

#### Azure Web App Service
- Follow Azure deployment guide in `docs/azure-deployment.md`
- Configure environment variables in Azure App Service
- Set up Azure Database for PostgreSQL

#### AWS Elastic Beanstalk
- Follow AWS deployment guide in `docs/aws-deployment.md`
- Configure environment variables in Elastic Beanstalk
- Set up AWS RDS for PostgreSQL

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Support

For support, email support@kitchofamily.com or raise an issue in the GitHub repository.