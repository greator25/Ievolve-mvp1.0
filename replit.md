# Ievolve Event Management System

## Overview

This is a comprehensive event management system built for the Ievolve Events organization. The application manages hotel accommodations, participant check-ins/check-outs, and team coordination for sports events. It features role-based access control with Admin and Team Coach dashboards, file upload capabilities for data management, and real-time notification systems. The system is designed to handle large-scale sporting events with multiple hotels, teams, and participants across different disciplines and locations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI using functional components and hooks
- **Vite Build Tool**: Fast development server and optimized production builds
- **TanStack Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight client-side routing
- **shadcn/ui Components**: Comprehensive UI component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first styling with custom design system variables
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Backend Architecture
- **Express.js**: RESTful API server with middleware-based architecture
- **TypeScript**: End-to-end type safety with shared schemas
- **Session-based Authentication**: Express sessions with PostgreSQL storage
- **MVC Pattern**: Organized service layer, storage abstraction, and route handlers
- **File Upload Processing**: Multer integration for CSV/PSV file handling
- **OTP System**: SMS-based authentication for coaches

### Database Design
- **PostgreSQL with Neon**: Serverless PostgreSQL database
- **Drizzle ORM**: Type-safe database operations with schema definitions
- **Relational Structure**: 
  - Users table for admins and coaches
  - Hotels table with instance-based inventory management
  - Participants table supporting coaches, officials, and players
  - Audit logging and reassignment tracking
- **Data Validation**: Unique constraints, date range validation, and referential integrity

### Authentication & Authorization
- **Dual Authentication System**:
  - Admin: Email/password with bcrypt hashing
  - Coach: Mobile number + OTP verification
- **Role-based Access Control**: Admin and coach roles with different permissions
- **Session Management**: Secure session storage with PostgreSQL backend
- **Route Protection**: Middleware-based authentication checks

### File Processing System
- **Multi-format Support**: CSV and PSV file uploads
- **Validation Engine**: Data integrity checks and duplicate prevention
- **Bulk Operations**: Efficient batch processing for large datasets
- **Error Handling**: Comprehensive validation reporting with warnings and errors

### Real-time Features
- **Notification System**: SMS integration for status updates and booking changes
- **Dashboard Analytics**: Real-time statistics and occupancy tracking
- **Status Management**: Check-in/check-out workflow with validation rules

## External Dependencies

### Database Services
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **Drizzle Kit**: Database migrations and schema management

### UI Framework & Components
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form validation and state management
- **Zod**: Runtime type validation and schema definition

### Development & Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking across the entire stack
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing and optimization

### Authentication & Security
- **bcryptjs**: Password hashing for admin accounts
- **Express Session**: Session management middleware
- **Connect PG Simple**: PostgreSQL session store

### File Handling & Processing
- **Multer**: Multipart form data and file upload handling
- **CSV/PSV Parsers**: Custom parsing logic for data import

### Notification Services
- **SMS Integration**: Planned integration with Twilio or similar service for OTP and notifications

### Development Environment
- **Replit Integration**: Development environment optimization with runtime error handling
- **WebSocket Support**: Real-time connection capabilities for live updates