# OCTA Calculator Backend

This document provides a comprehensive overview of the backend implementation for the OCTA Calculator application, an insurance policy management system that allows users to select insurance providers, durations, and complete checkouts for car insurance policies.

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm run start
```

## System Architecture

The backend is built using Express.js with MongoDB as the database. It follows a modular architecture with clear separation of concerns:

- **Routes**: Define API endpoints
- **Controllers**: Handle business logic
- **Middleware**: Process requests before they reach controllers
- **Models**: Define data structures
- **Utils**: Provide helper functions and third-party API integrations

## Application Flow

### 1. Server Initialization

The application starts in `server.js`, which:
1. Connects to MongoDB using the connection string from environment variables
2. Starts the Express server on the specified port

### 2. Express Application Setup

The `app.js` file configures the Express application by:
1. Setting up middleware for parsing JSON and XML requests
2. Configuring CORS for cross-origin requests
3. Setting up request logging
4. Registering API routes
5. Adding error handling middleware

## API Endpoints

### Auto Insurance Pricing

**Endpoint**: `POST /api/auto`

**Flow**:
1. Request validation via `validateAutoMiddleware`
2. Sequential pricing retrieval from multiple insurance providers:
   - Balcia pricing via `balciaPricing` middleware
   - Ergo pricing via `ergoPricing` middleware
   - Balta pricing via `baltaPricing` middleware
3. Response formatting and sending via `autoController`

**Individual Provider Endpoints**:
- `POST /api/auto/balcia` - Get pricing from Balcia only
- `POST /api/auto/ergo` - Get pricing from Ergo only
- `POST /api/auto/balta` - Get pricing from Balta only

### Payment Processing

**Create Payment Endpoint**: `POST /api/payment/create`

**Flow**:
1. Request validation via `validateCheckoutMiddleware`
2. Policy offer creation via `savePolicyOffer` in `policyService.js`
3. Order creation in MongoDB
4. Payment initiation with SEB payment gateway
5. Order status update to "checkout_initiated"
6. Return payment link to frontend

**Payment Callback Endpoint**: `GET /api/payment/callback`

**Flow**:
1. Receive callback from SEB payment gateway
2. Verify payment status with SEB API
3. If payment is successful:
   - Update order status to "paid"
   - Approve policy via `approvePolicy` in `policyService.js`
   - Update order status to "policy_approved"
4. If payment fails:
   - Update order status to "failed"

## Middleware

### Validation Middleware

- `validateAutoMiddleware`: Validates car registration requests using Joi schema
- `validateCheckoutMiddleware`: Validates checkout requests using Joi schema

### Insurance Provider Middleware

- `balciaPricing`: Retrieves pricing from Balcia API
- `ergoPricing`: Retrieves pricing from Ergo API
- `baltaPricing`: Retrieves pricing from Balta API

Each middleware:
1. Extracts car data from request
2. Calls the respective provider's API
3. Adds pricing data to the response object
4. Passes control to the next middleware

### Error Handling

`errorHandler` middleware:
1. Logs all errors
2. Returns appropriate error responses based on error type
3. Handles provider-specific errors differently from general server errors

## Models

### Order Model

The `Order` model tracks the complete lifecycle of an insurance policy order with the following states:

1. `CREATED`: Initial state when order is created
2. `CHECKOUT_INITIATED`: Checkout process started
3. `PAYMENT_PENDING`: Waiting for payment
4. `PAID`: Payment successful
5. `POLICY_APPROVED`: Policy approved by provider
6. `FAILED`: Order failed at any stage

**Key Methods**:
- `updateStatus`: Updates order status with timestamp and notes
- `initiateCheckout`: Updates status to checkout initiated with payment reference
- `markAsPaid`: Updates status to paid
- `approvePolicyWithId`: Updates status to policy approved with policy ID
- `markAsFailed`: Updates status to failed with reason
- `createInitialOrder`: Static method to create a new order

## Utility Services

### Policy Service

`policyService.js` provides two main functions:

1. **savePolicyOffer**: Creates a policy offer with the selected insurance provider
   - Takes provider ID, car data, and duration
   - Uses a switch case to call the appropriate provider's `savePolicy` function
   - Returns policy ID and price

2. **approvePolicy**: Approves a policy with the selected insurance provider after payment
   - Takes an order object
   - Uses a switch case to call the appropriate provider's `concludePolicy` function
   - Returns the approved policy ID

### Insurance Provider Integrations

#### Balcia Integration (`balcia.js`)

- `getPricing`: Retrieves pricing information
- `savePolicy`: Creates a policy offer
- `concludePolicy`: Approves a policy after payment

#### Balta Integration (`balta.js`)

- `getPricing`: Retrieves pricing information
- `savePolicy`: Creates a policy offer
- `concludePolicy`: Approves a policy after payment

#### Ergo Integration (`ergo.js`)

- `getPricing`: Retrieves pricing information
- `savePolicy`: Creates a policy offer
- `concludePolicy`: Approves a policy after payment

## Validation

`validation.js` defines Joi schemas for request validation:

- `carDataSchema`: Validates car registration data
- `phoneSchema`: Validates phone number format
- `checkoutSchema`: Validates checkout request data

## Payment Integration

The application integrates with SEB payment gateway for processing payments:

1. **Payment Initiation**:
   - Creates a payment request with SEB API
   - Receives a payment link and reference
   - Updates order status

2. **Payment Verification**:
   - Receives callback from SEB with payment status
   - Verifies payment status with SEB API
   - Updates order status accordingly

## Important Notes

### Untested Components

**⚠️ IMPORTANT:** The following components have not been fully tested:

1. **SEB Payment Flow**: The complete payment flow with SEB has not been tested in a production environment.

2. **Policy Service**: The `policyService.js` utility, particularly the `approvePolicy` function, has not been thoroughly tested with real insurance providers.

3. **Post-Checkout Flow**: Everything from the checkout state onward is relatively unknown. The actual behavior of the system after payment may differ from what is expected.

When continuing development, focus on testing these components thoroughly before deploying to production.

## Environment Variables

The application requires the following environment variables:

- **Database**: `MONGODB_URI`
- **Server**: `PORT`
- **Insurance Providers**: `INSURANCE_COMPANIES` (comma-separated list)
- **Balcia API**: `BALCIA_URL`, `BALCIA_USER`, `BALCIA_PASSWORD`
- **Balta API**: `BALTA_API_URL`
- **Ergo API**: `ERGO_URL`, `ERGO_USER`, `ERGO_PASSWORD`
- **SEB Payment**: `SEB_API_URL`, `SEB_API_USERNAME`, `SEB_API_SECRET`, `SEB_ACCOUNT_NAME`, `SEB_SUCCESS_URL`

## Error Handling

The application uses a centralized error handling approach:

1. Provider-specific errors are prefixed with the provider name (e.g., "Balcia: Error message")
2. These errors are returned to the client with a 400 status code
3. General server errors are logged and returned with a generic message and 500 status code

## Conclusion

This backend implementation provides a robust foundation for the OCTA Calculator application. However, several critical components remain untested, particularly around payment processing and policy approval. Future development should focus on thorough testing of these components before production deployment.
