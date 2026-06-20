require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const app = express();
const fs = require("fs");

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}


app.use(cors());
app.use(express.json());






app.use("/uploads", express.static("uploads"));

const crypto = require("crypto");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: "rzp_test_T3wtWaYwxmQabx",
  key_secret: "KlO4Zz1XkrSazW6TMrpuOwUc"
});




// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

// db.connect((err) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log("Database Connected");
//   }
// });



const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect((err) => {
  if (err) {
    console.log("DB Error:", err);
  } else {
    console.log("Database Connected");
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.post("/api/products", upload.single("image"), (req, res) => {
  const {
    Category,
    ProductName,
    Rating,
    TotalRatings,
    Feature1,
    Feature2,
    Feature3,
    Price,
    DiscountPercent,
    Bestseller,
  } = req.body;
console.log("hello", Category,
    ProductName,
    Rating,
    TotalRatings,
    Feature1,
    Feature2,
    Feature3,
    Price,
    DiscountPercent,
    Bestseller,);
  const ImagePath = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO products
    (
      Category,
      ProductName,
      ImagePath,
      Rating,
      TotalRatings,
      Feature1,
      Feature2,
      Feature3,
      Price,
      DiscountPercent,
      Bestseller
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `;

  db.query(
    sql,
    [
      Category,
      ProductName,
      ImagePath,
      Rating,
      TotalRatings,
      Feature1,
      Feature2,
      Feature3,
      Price,
      DiscountPercent,
      Bestseller,
    ],
    (err, result) => {
    if (err) {
  console.log("PRODUCT ERROR:", err);
  return res.status(500).json(err);
}

      res.json({
        success: true,
        message: "Product Saved Successfully",
      });
    }
  );
});


app.get("/health", (req, res) => {
  res.status(200).send("OK");
});





// GET all products
app.get("/api/products", (req, res) => {
  const sql = "SELECT * FROM products ORDER BY ProductID DESC";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

// DELETE a product by ID
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM products WHERE ProductID = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json({
      success: true,
      message: "Product Deleted Successfully",
    });
  });
});

// UPDATE a product by ID
app.put("/api/products/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const {
    Category,
    ProductName,
    Rating,
    TotalRatings,
    Feature1,
    Feature2,
    Feature3,
    Price,
    DiscountPercent,
    Bestseller,
  } = req.body;

  let sql = `
    UPDATE products SET
      Category = ?,
      ProductName = ?,
      Rating = ?,
      TotalRatings = ?,
      Feature1 = ?,
      Feature2 = ?,
      Feature3 = ?,
      Price = ?,
      DiscountPercent = ?,
      Bestseller = ?
  `;
  
  let params = [
    Category,
    ProductName,
    Rating,
    TotalRatings,
    Feature1,
    Feature2,
    Feature3,
    Price,
    DiscountPercent,
    Bestseller,
  ];

  if (req.file) {
    sql += `, ImagePath = ?`;
    params.push(req.file.filename);
  }

  sql += ` WHERE ProductID = ?`;
  params.push(id);

  db.query(sql, params, (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json({
      success: true,
      message: "Product Updated Successfully",
    });
  });
});

// POST user signup
app.post("/api/signup", (req, res) => {
  const { Name, Phone, Password } = req.body;
  console.log("hello", Name, Phone, Password);
  if (!Name || !Phone || !Password) {
    return res.status(400).json({ success: false, message: "Please provide all details" });
  }

  const sql = "INSERT INTO users (Name, Phone, Password, IsActive, Role) VALUES (?, ?, ?, 1, 'User')";
  db.query(sql, [Name, Phone, Password], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ success: false, message: "Mobile number is already registered!" });
      }
      return res.status(500).json({ success: false, error: err });
    }
    res.json({
      success: true,
      message: "User registered successfully!",
      userId: result.insertId,
    });
  });
});

// POST user login/checklogin
app.post("/api/login", (req, res) => {
  const { Phone, Password } = req.body;

  if (!Phone || !Password) {
    return res.status(400).json({ success: false, message: "Please enter phone and password" });
  }

  const sql = "SELECT * FROM users WHERE Phone = ? AND Password = ? AND IsActive = 1";
  db.query(sql, [Phone, Password], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, error: err });
    }

    if (results.length > 0) {
      const user = results[0];
      res.json({
        success: true,
        message: "Login successful!",
        user: {
          name: user.Name,
          mobile: user.Phone,
          userId: user.UserID,
          role: user.Role,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid phone/password or account is inactive.",
      });
    }
  });
});

// GET all users (Admin)
app.get("/api/users", (req, res) => {
  const sql = "SELECT * FROM users ORDER BY UserID DESC";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json(err); 
    }
    res.json(results);
  });
});

// DELETE a user by UserID (Admin)
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM users WHERE UserID = ?";
  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json({
      success: true,
      message: "User Deleted Successfully",
    });
  });
});

// UPDATE a user by UserID (Admin)
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const { Name, Phone, Password, IsActive, Role } = req.body;
  const sql = "UPDATE users SET Name = ?, Phone = ?, Password = ?, IsActive = ?, Role = ? WHERE UserID = ?";
  db.query(sql, [Name, Phone, Password, IsActive, Role, id], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json({
      success: true,
      message: "User Updated Successfully",
    });
  });
});

// POST create a new user manually (Admin)
app.post("/api/users", (req, res) => {
  const { Name, Phone, Password, IsActive, Role } = req.body;
  const sql = "INSERT INTO users (Name, Phone, Password, IsActive, Role) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [Name, Phone, Password, IsActive || 1, Role || 'User'], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ success: false, message: "Phone number is already registered!" });
      }
      return res.status(500).json(err);
    }
    res.json({
      success: true,
      message: "User Created Successfully",
      userId: result.insertId,
    });
  });
});

// GET single user by ID (to check address)
app.get("/api/users/check/:id", (req, res) => {
  const { id } = req.params;
  console.log("Fetching user with ID:", id);
  db.query("SELECT * FROM users WHERE UserID = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err });
    if (results.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user: results[0] });
  });
});

// PUT update user address fields
app.put("/api/defrt/:id", (req, res) => {
  const { id } = req.params;
  const { HouseNo, Address, NearBy, City, State, PinCode } = req.body;
  const sql = "UPDATE users SET HouseNo=?, Address=?, NearBy=?, City=?, State=?, PinCode=? WHERE UserID=?";
  db.query(sql, [HouseNo, Address, NearBy, City, State, PinCode, id], (err) => {
    if (err) return res.status(500).json({ success: false, error: err });
    res.json({ success: true, message: "Address saved successfully!" });
  });
});

app.use("/uploads", express.static("uploads"))
app.get("/api/products", (req, res) => {
  const sql = "SELECT * FROM products ORDER BY ProductID DESC";

  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }

    res.json({
      success: true,
      count: result.length,
      products: result
    });
  });
});


// app.post("/api/orders", (req, res) => {
//   const { UserID, items } = req.body;

//   if (!UserID || !items || items.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid order data"
//     });
//   }

//   const values = items.map(item => [
//     item.ProductID || item.id,
//     item.qty,
//     item.Price || item.price,
//     (item.Price || item.price) * item.qty,
//     UserID
//   ]);

//   const sql = `
//     INSERT INTO Orders
//     ( ProductID, Qty, Price, TotalAmount, UserID)
//     VALUES ?
//   `;

//   db.query(sql, [values], (err, result) => {
//     if (err) {
//       console.log(err);
//       return res.status(500).json({
//         success: false,
//         message: "Database Error"
//       });
//     }

//     res.json({
//       success: true,
//       message: "Order Placed Successfully",
//       orderCount: result.affectedRows
//     });
//   });
// });

app.post("/api/orders", (req, res) => {
  const { UserID, items } = req.body;

  if (!UserID || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid order data"
    });
  }

  let completed = 0;

  items.forEach((item) => {
    const productId = item.ProductID || item.id;

    db.query(
      "SELECT FinalDayDelivery FROM delivery WHERE ProductID = ? LIMIT 1",
      [productId],
      (err, deliveryResult) => {
        if (err) {
          console.log(err);
          return res.status(500).json({
            success: false,
            message: "Delivery fetch error"
          });
        }

        const finalDayDelivery =
          deliveryResult.length > 0
            ? deliveryResult[0].FinalDayDelivery
            : null;

        const sql = `
          INSERT INTO orders
          (
            ProductID,
            Qty,
            Price,
            TotalAmount,
            UserID,
            FinalDayDelivery
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
          sql,
          [
            productId,
            item.qty,
            item.Price || item.price,
            (item.Price || item.price) * item.qty,
            UserID,
            finalDayDelivery
          ],
          (err) => {
            if (err) {
              console.log(err);
              return res.status(500).json({
                success: false,
                message: "Order save error"
              });
            }

            completed++;

            if (completed === items.length) {
              res.json({
                success: true,
                message: "Order Placed Successfully"
              });
            }
          }
        );
      }
    );
  });
});

app.get("/api/orders/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT
      o.OrderID,
      o.ProductID,
      o.Qty,
      o.Price,
      o.TotalAmount,
      o.FinalDayDelivery,
      o.CreatedDate,
      p.ProductName,
      p.ImagePath,
      p.DiscountPercent,
      p.Category,
      o.Ordered,
      o.Packed,
      o.Shipped,
      o.Delivered
    FROM orders o
    INNER JOIN products p
      ON o.ProductID = p.ProductID
    WHERE o.UserID = ?
    ORDER BY o.OrderID DESC
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Database Error"
      });
    }

    res.json({
      success: true,
      orders: result
    });
  });
});

app.get("/api/orderslist", (req, res) => {

  const sql = `   
    SELECT
      o.OrderID,
      o.ProductID,
      o.Qty,
      o.Price,
      o.TotalAmount,
      o.UserID,
      o.FinalDayDelivery,
      o.CreatedDate,
      p.ProductName,
      p.ImagePath,
      p.DiscountPercent,
      p.Category,
      u.Name as UserName,
      u.Phone as UserPhone,
      u.Email as UserEmail,
      u.HouseNo,
      u.Address,
      u.NearBy,
      u.City,
      u.State,
      u.PinCode,
      o.Ordered,
      o.Packed,
      o.Shipped,
      o.Delivered
    FROM orders o
    INNER JOIN products p
      ON o.ProductID = p.ProductID
    INNER JOIN users u
      ON o.UserID = u.UserID
    ORDER BY o.OrderID DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Database Error"
      });
    }

    res.json({
      success: true,
      orders: result
    });
  });
});

// PUT update order status
app.put("/api/orders/:orderId/status", (req, res) => {
  const { orderId } = req.params;
  const { status, value } = req.body; // status can be 'Packed', 'Shipped', or 'Delivered', value can be 0 or 1

  const sql = `UPDATE orders SET ${status} = ? WHERE OrderID = ?`;

  db.query(sql, [value, orderId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Database Error"
      });
    }

    res.json({
      success: true,
      message: `${status} status updated to ${value} successfully`
    });
  });
});



app.post("/api/payment/create", (req, res) => {
  const { UserID,Mobile, Amount } = req.body;

const options = {
  amount: Amount * 100, // INR -> Paise
  currency: "INR",
  receipt: `user_${UserID}_${Date.now()}`,
   notes: {
    UserID: String(UserID),
    Mobile: String(Mobile)
  }
};


  razorpay.orders.create(options, (err, order) => {
    if (err) {
      return res.status(500).json({ success: false });
    }

    const sql = `
      INSERT INTO orderpayment
      (
        UserID,
        Amount,
        Status,
        TransactionID,
        PaymentGateway,
        CreatedDate
      )
      VALUES (?, ?, 0, ?, 'Razorpay', NOW())
    `;

    db.query(
      sql,
      [
        UserID,
        Amount,
        order.id
      ],
      (err2, result) => {

        if (err2) {
          return res.status(500).json({
            success: false
          });
        }

        res.json({
          success: true,
          order,
          PaymentID: result.insertId
        });
      }
    );
  });
});





app.post("/api/payment/verify", (req, res) => {

  const {
    UserID,
    PaymentID,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  const body =
    razorpay_order_id +
    "|" +
    razorpay_payment_id;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        "KlO4Zz1XkrSazW6TMrpuOwUc"
      )
      .update(body.toString())
      .digest("hex");

  if (
    expectedSignature ===
    razorpay_signature
  ) {

    const sql = `
UPDATE orderpayment
SET
  Status = 1,
  RazorpayOrderID = ?,
  RazorpayPaymentID = ?,
  PaymentSignature = ?,
  PaymentDate = NOW()
WHERE PaymentID = ?
AND UserID = ?
`;

    db.query(
      sql,
     [
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    PaymentID,
    UserID
  ],
      (err) => {

        if (err) {
          return res.status(500).json({
            success: false
          });
        }

        res.json({
          success: true
        });
      }
    );

  } else {

    db.query(
      `
      UPDATE orderpayment
      SET Status = 2
      WHERE PaymentID = ?
      `,
      [PaymentID]
    );

    res.status(400).json({
      success: false
    });
  }
});



app.get("/api/orderpayments", (req, res) => {

  const sql = `
    SELECT
      PaymentID,
      UserID,
      OrderID,
      TransactionID,
      PaymentSignature,
      PaymentGateway,
      Amount,
      Currency,
      Status,
      PaymentMethod,
      PaymentDate,
      CreatedDate
    FROM orderpayment
    WHERE IsDeleted = 0
    ORDER BY PaymentID DESC
  `;

  db.query(sql, (err, result) => {

    if (err) {
      return res.status(500).json({
        success: false,
        message: "Database Error"
      });
    }

    res.json({
      success: true,
      payments: result
    });
  });

});

app.delete("/api/orderpayments/:id", (req, res) => {

  const { id } = req.params;

  const sql = `
    UPDATE orderpayment
    SET IsDeleted = 1
    WHERE PaymentID = ?
  `;

  db.query(sql, [id], (err) => {

    if (err) {
      return res.status(500).json({
        success: false
      });
    }

    res.json({
      success: true,
      message: "Deleted Successfully"
    });
  });

});

app.listen(3000, () => {
  console.log("Server Running On Port 3000");
});
