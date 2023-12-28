const express = require("express");
const mysql = require("mysql2");
const YAML = require("yaml");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const file = fs.readFileSync("./swagger.yaml", "utf8");
const swaggerDocument = YAML.parse(file);

const cors = require("cors");

require("dotenv").config();

const { HOST_SQL, USER_SQL, PASSWORD_SQL, DATABASE_SQL, PORT } = process.env;

const app = express();
const port = 5500;
app.use(cors());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(express.json());

const pool = mysql.createPool({
  host: HOST_SQL,
  user: USER_SQL,
  port: parseInt(PORT || "3306"),
  password: PASSWORD_SQL,
  database: DATABASE_SQL,
  waitForConnections: true,
  connectionLimit: 10,
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: "utc",
  // dateStrings: true
});

try {
  pool.getConnection((err) => {
    if (err) {
      console.error("Error connecting to database:", err);
      return;
    }
    console.log("Connected to database!");
  });
} catch (error) {
  console.error("Error connecting to database:", error);
}


app.get("/api/cars_all", async (req, res) => {
  try {
    pool.query(
      "SELECT * FROM `carsform` WHERE 1 ORDER BY `วันที่เดินทางไป` DESC LIMIT 100;",
      (err, results, fields) => {
        if (err) {
          console.error("Error executing the query:", err);
          return res.status(500).json({ error: "Internal Server Error" });
        }
        res.json(results);
        console.log(results); // results contains rows returned by server
        console.log(fields); // fields contains extra meta data about results, if available
      }
    );
  } catch (error) {
    console.error("Error executing the query:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});



app.get("/api/cars/:section/:car/:year/:month", async (req, res) => {
    const { section, car, year, month } = req.params;

    let condition = "WHERE `license`.`Section` !='0000' ";
    if (section !== "เลือกทั้งหมด") {
        condition += ` AND \`license\`.\`Section\` ='${section}'`;
    }
    if (car !== "เลือกทั้งหมด") {
        condition += ` AND \`เลขทะเบียนรถ\`='${car}'`;
    }
    if (year !== "เลือกทั้งหมด") {
        condition += ` AND YEAR(\`วันที่เดินทางไป\`)='${year}'`;
    }
    if (month !== "เลือกทั้งหมด") {
        condition += ` AND MONTH(\`วันที่เดินทางไป\`)='${month}'`;
    }

    const sql = `SELECT MONTH(\`วันที่เดินทางไป\`) as 'ประจำเดือน', SUM(\`เลขไมค์ระยะรวม\`) as 'ระยะทางรวม(กิโลเมตร)' , SUM(\`การเติมน้ำมันจำนวน\`) as 'เติมน้ำมันรวม(ลิตร)', SUM(\`การเติมน้ำมันราคา\`) as 'เติมน้ำมันรวม(บาท)' , (SUM(\`เลขไมค์ระยะรวม\`)/ SUM(\`การเติมน้ำมันจำนวน\`) ) as 'อัตราการใช้น้ำมัน(km/ลิตร)' , (SUM(\`การเติมน้ำมันราคา\`)/ SUM(\`การเติมน้ำมันจำนวน\`) ) as 'ราคาน้ำมัน(บาท/ลิตร)' FROM \`carsform\`Join \`license\` ON \`carsform\`.\`เลขทะเบียนรถ\`=\`license\`.\`Car\` ${condition} GROUP BY MONTH(\`วันที่เดินทางไป\`)`;

   pool.query(
        sql,
        (err, results, fields) => {
            if (err) {
                console.error("Error executing the query:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            res.json(results);
            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available
        }
    );
});


app.get("/api/license/:section", async (req, res) => {
    const { section } = req.params;
    try {
        const results = await new Promise((resolve, reject) => {
           pool.query(
                `SELECT * FROM license WHERE Section = '${section}'`,
                (err, results, fields) => {
                    if (err) {
                        console.error("Error executing the query:", err);
                        return reject(err);
                    }
                    resolve(results);
                    console.log(results); // results contains rows returned by server
                    console.log(fields); // fields contains extra meta data about results, if available
                }
            );
        });
        res.json(results);
    } catch (error) {
        console.error("Error executing the query:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/license/status/:status", (req, res) => {
    const { status } = req.params;
    pool.query(
        `SELECT * FROM license WHERE Status = '${status}'`,
        (err, results, fields) => {
            if (err) {
                console.error("Error executing the query:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            res.json(results);
            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available
        }
    );
});

app.get("/api/license/check/insert/:license", (req, res) => {
    const { license } = req.params;
    pool.query(
        `SELECT * FROM license WHERE Car = '${license}';`,
        (err, results, fields) => {
            if (err) {
                console.error("Error executing the query:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            res.json(results);
            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available
        }
    );
});

app.get("/api/miles/check/update/:license", (req, res) => {
    const { license } = req.params;
    pool.query(
        `SELECT * FROM carsform WHERE เลขทะเบียนรถ = '${license}' ORDER BY id DESC LIMIT 1;`,
        (err, results, fields) => {
            if (err) {
                console.error("Error executing the query:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            res.json(results);
            console.log(results); // results contains rows returned by server
            console.log(fields); // fields contains extra meta data about results, if available
        }
    );
});



app.get("/api/departments/:department/:divition", async (req, res) => {
    const { department, divition } = req.params;
    try {
        const results = await new Promise((resolve, reject) => {
            pool.query(
                `SELECT * FROM section WHERE Department = '${department}' AND Divition = '${divition}'`,
                (err, results, fields) => {
                    if (err) {
                        console.error("Error executing the query:", err);
                        return reject(err);
                    }
                    resolve(results);
                    console.log(results); // results contains rows returned by server
                    console.log(fields); // fields contains extra meta data about results, if available
                }
            );
        });
        res.json(results);
    } catch (error) {
        console.error("Error executing the query:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/departments/:department", async (req, res) => {
    const { department } = req.params;
    try {
        const results = await new Promise((resolve, reject) => {
            pool.query(
                `SELECT DISTINCT(Divition) FROM section WHERE Department = '${department}'`,
                (err, results, fields) => {
                    if (err) {
                        console.error("Error executing the query:", err);
                        return reject(err);
                    }
                    resolve(results);
                    console.log(results); // results contains rows returned by server
                    console.log(fields); // fields contains extra meta data about results, if available
                }
            );
        });
        res.json(results);
    } catch (error) {
        console.error("Error executing the query:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
  

