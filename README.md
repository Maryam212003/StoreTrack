
# **StoreTrack –  Project Documentation**

**Maryam Sadat Mousavi**

**Fatemeh Hajighadiri**

---


## **Steps & Installation**

### **1. Backend Setup**

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```


3. **Configure environment variables:**:

- Create a .env file in the backend folder.

- Example:

   ```env
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/storetrack
    JWT_SECRET=your_jwt_secret

   ```

4. **Run the server:**:

   ```bash
   npm start
   ```
  - The backend API will be accessible at http://localhost:3000.



### **2. Frontend Setup**

#### - **Local Execution**
1. Ensure all frontend files (`index.html`, `style.css`, `script.js`) are located in the same directory.
2. Open `index.html` directly in your web browser.
3. For full functionality, including data retrieval and manipulation, your backend server must be running and accessible at the configured API endpoint.


---


## **Backend Documentation**

### **1. Introduction**
The backend of this system is a RESTful API service that manages the data and business logic for the Inventory & Order Management System.  
It provides endpoints to:
- Manage **categories**, **products**, and **stock**
- Create and process **orders**
- Track **order items**
- Maintain **stock history**
- Generate **sales and inventory reports**

All operations are performed securely, with a modular architecture for scalability.

---

### **2. Backend Structure**
The backend is organized into several core layers:

#### **2.1. Routing Layer**
- Implemented with **Express.js**.
- Each feature (Products, Orders, Categories, etc.) has its own route file.
- Routes define available endpoints and link them to controllers.

Example:
```javascript
router.get('/allProducts', productController.getAllProducts);
router.post('/addNewProduct', productController.createProduct);
```

#### **2.2. Controller Layer**
- Handles incoming HTTP requests.
- Validates parameters.
- Calls the relevant service functions.
- Formats the response to send back to the client.

Example:
- `ProductController`:
  - `createProduct`: Validates product data, saves it to the database, creates a stock history record.
  - `getAllProducts`: Retrieves all active products from the database.

#### **2.3. Service Layer**
- Contains business logic.
- Performs calculations, complex queries, and database manipulations.
- Example:
  - The **Order Service**:
    - Validates product availability before creating an order.
    - Updates stock levels.
    - Records stock changes in `StockHistory`.

#### **2.4. Model Layer**
- Defines database schemas and relationships using **Mongoose**.
- Ensures data integrity and type validation.

Example – Product Model:
```javascript
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  stock: Number,
  price: Number,
  thruDate: Date
});
```

#### **2.5. Middleware**
- **Authentication Middleware**: Verifies JWT tokens for protected routes.
- **Validation Middleware**: Ensures required parameters exist and are valid.
- **Error Handling Middleware**: Catches errors and sends a unified error response.

#### **2.6. Utility Functions**
- **Pagination**: For listing products/orders in pages.
- **Date Formatting**: Formats timestamps in responses.
- **Search & Filtering**: For advanced product and order searches.

---

### **3. Backend Components**

#### **3.1. Categories Module**
- Stores hierarchical product categories.
- Allows fetching all categories or specific category details.
- Useful for product classification and filtering.

#### **3.2. Products Module**
- Manages product lifecycle:
  - Creation with stock tracking.
  - Updating product details.
  - Stock adjustments.
  - Expiration handling.
- Integrates with `StockHistory` for inventory audit trail.

#### **3.3. Orders Module**
- Handles order creation and processing.
- Supports:
  - Order status updates.
  - Searching orders by filters.
  - Cancelling orders (adjusting stock if necessary).
- Orders are linked to `OrderItems`.

#### **3.4. Order Items Module**
- Stores each product within an order.
- Allows updating quantity or removing items from an order.
- Fetches all items in a specific order.

#### **3.5. Stock History Module**
- Keeps a record of every stock change:
  - Stock additions.
  - Product sales.
  - Expirations.
  - Manual adjustments.
- Supports search and filtering for audit purposes.

#### **3.6. Reports Module**
- Generates analytical data:
  - **Sales by product** – total quantity and revenue per product.
  - **Sales by date** – daily, monthly, or yearly revenue and sales trends.
- Uses date filtering for custom reporting.

---

### **4. Database Design**
- **MongoDB** is used for its flexibility and scalability.
- Key relationships:
  - **Category → Product** (One-to-many)
  - **Order → OrderItems** (One-to-many)
  - **Product → StockHistory** (One-to-many)
- Collections:
  - Categories
  - Products
  - Orders
  - OrderItems
  - StockHistory

---

### **5. Authentication & Security**
- JWT-based authentication for secure API access.
- Middleware checks the token for protected routes.
- Roles and permissions can be added later for admin/staff/user distinction.

---

### **6. Error Handling**
- Centralized middleware to capture all errors.
- Sends standardized JSON error responses.
- Logs errors for debugging.

Example error response:
```json
{
  "success": false,
  "message": "Product not found",
  "code": 404
}
```

---

### **7. Testing**
- **Postman** used for manual testing.
- Unit and integration tests can be implemented using **Jest** or **Mocha**.

---

### **8. Deployment**
- Can be deployed on:
  - Heroku
  - AWS EC2
  - Docker
- Use `pm2` for process management in production.
- Environment variables are stored securely.

---

## **Frontend Documentation**

### **1. Introduction**
The StoreTrack frontend is a web-based inventory and sales management system designed to provide users with an intuitive interface for managing products, processing orders, and generating reports. Developed using core web technologies, it focuses on delivering a responsive and user-friendly experience.

---

### **2. Technologies Used**
The frontend is built with a standard stack of web technologies:
- **HTML5**: Provides the foundational structure and content for all web pages.
- **CSS3**: Handles the visual styling, layout, and responsiveness, ensuring a consistent look across various devices.
- **JavaScript (ES6+)**: Implements the core logic, dynamic interactions, API communication, and client-side data manipulation.
- **Font Awesome**: Utilized for a wide range of scalable vector icons, enhancing the visual appeal and usability.
- **Chart.js**: A popular JavaScript library for creating interactive and customizable charts, primarily used for sales reports.

---

### **3. Project File Structure**
```
front-end/
├── index.html     # The main entry point of the application.
├── style.css      # Contains all the CSS rules for styling the application.
├── script.js      # The core JavaScript file containing application logic, API calls, and DOM manipulation.
```

---



### **4. Core Frontend Modules and Functionality**

#### **4.1. index.html**
Defines the overall layout and user interface. It includes:
- Navigation bar with links to different sections (Dashboard, Products, Orders, Reports).
- `<section>` elements for each major view, controlled by JavaScript to show/hide.
- Modals for adding/editing products, creating orders, and viewing low-stock items or order details.

#### **4.2. script.js**
The heart of the frontend, containing all the JavaScript logic. Responsibilities include:
- **Page Navigation**: Manages the active page display.
- **API Communication**: Uses an `apiRequest` helper to handle requests.
- **State Management**: Stores current data in a state object.
- **Dynamic Rendering**: Populates HTML tables and lists.
- **Modal Management**: Shows/hides modals and fills content.
- **Filtering and Search**: Sends filters to backend search APIs and renders results.
- **Reporting**: Uses Chart.js for visualizing sales data.

#### **4.3. API Endpoint Configuration (script.js)**
```javascript
const API_BASE_URL = 'http://localhost:3000';
// Change to 'http://backend:3000' for Docker
```

---

### **5. Development and Maintenance Guidelines**
- **Modularity**: Functions are organized by purpose.
- **User Feedback**: Uses alerts for critical actions and errors.
- **Responsiveness**: CSS adapts to different screen sizes.
- **Error Handling**: Uses try-catch in async functions.

---
