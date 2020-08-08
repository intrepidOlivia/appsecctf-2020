import * as path from "path"
import { promisify } from "util";

import express from "express";
import cookieParser from "cookie-parser";
import * as bodyParser from "body-parser";
import * as fs from "fs-extra";
import * as crypto from "@ronomon/crypto-async";
import { Pool } from "pg";
import { Provider } from "nconf";

const hash = promisify<string, Buffer, Buffer>(crypto.hash);
const hmac = promisify<string, Buffer, Buffer, Buffer>(crypto.hmac);

const nconf = (new Provider())
    .argv()
    .env()
    .defaults({
        PG_USER: "postgres",
        PG_PASS: undefined,
        PG_PORT: "5432",
        PG_HOST: "pg",
        JWT_SECRET: "dev-secret",
    });

const pool = new Pool({
    user: nconf.get("PG_USER"),
    password: nconf.get("PG_PASS"),
    host: nconf.get("PG_HOST"),
    port: parseInt(nconf.get("PG_PORT"), 10),
    statement_timeout: 5000
});

const jwtSecret = Buffer.from(nconf.get("JWT_SECRET"));

namespace JWT {
    export async function create(data: object) {
        let algo = Buffer.from(JSON.stringify({ "alg": "HS256" })).toString("base64");
        let payload = Buffer.from(JSON.stringify(data)).toString("base64");
        let signature = (await hmac("sha256", jwtSecret, Buffer.from(`${algo}.${payload}`))).toString("base64");

        return `${algo}.${payload}.${signature}`;
    }

    export async function get(data: string) {
        let [algo, payload, signature] = data.split(".");
        let correctSignature = (await hmac("sha256", jwtSecret, Buffer.from(`${algo}.${payload}`))).toString("base64");
        if (signature === correctSignature) {
            return JSON.parse(Buffer.from(payload, "base64").toString("ascii"));
        } else {
            return undefined;
        }
    }
}

const app = express();

const clientRoot = path.join(__dirname, "../../client");

app.use(bodyParser.json())
app.use(cookieParser())
app.use("/static/", express.static(path.join(clientRoot, "/static/")));

app.get("/", async (req, res) => {
    let file = await fs.readFile(path.join(clientRoot, "index.html"));
    res.type("text/html").send(file.toString());
});

app.get("/ui", async (req, res) => {
    let file = await fs.readFile(path.join(clientRoot, "ui.html"));
    res.type("text/html").send(file.toString());
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (typeof username !== "string" || typeof password !== "string") {
        return res.status(401).send("Bad credentials");
    }

    const hashedPassword = (await hash("sha1", Buffer.from(password))).toString("hex").toLowerCase();

    const client = await pool.connect();
    try {
        await client.query(`BEGIN`);

        await client.query(`
INSERT INTO _pgui.login (username) VALUES ($1) RETURNING id;
        `, [username]);

        const result = await client.query(`
SELECT id
FROM _pgui.user_auth
WHERE username=$1 AND password=$2
        `, [username, hashedPassword]);

        if (result.rowCount !== 1) {
            throw new Error("Login Failed");
        }

        const { id } = result.rows[0];
        res.cookie("user", await JWT.create({ id, username }));
        res.redirect("/ui");

        await client.query(`COMMIT`);
    } catch(e) {
        await client.query(`ABORT`);
        res.status(401).send("Bad credentials");
    } finally {
        client.release();
    }
});

app.post("/query", async (req, res) => {
    const user = JWT.get(req.cookies["user"]);
    const { query: encodedQuery } = req.body;

    let query = Buffer.from(encodedQuery, "base64").toString("ascii");

    if (typeof query !== "string") {
        throw new Error("Invalid query");
    }

    const client = await pool.connect();
    let rows: any[] = [];

    try {
        await client.query("BEGIN");

        let results = await client.query({
            text: query,
            rows: 20
        } as any);

        rows = results.rows;

        let userId = (await user)?.id;

        if (!userId) {
            throw new Error("Invalid User");
        }

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ABORT");
        throw e;
    } finally {
        client.release();
    }

    res.status(200).send(rows);
})

process.on("unhandledRejection", (e) => console.error(e));

app.listen("5000");