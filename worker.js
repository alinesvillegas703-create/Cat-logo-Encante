const BASE = "appT18SKLcRy9iNLd";

const TABLES = {
ropa: {
id: "tblJXe6he0gMvRlCi"
},
accesorios: {
id: "tbl3FDdm2Zq89HdRI"
}
};

async function airtableTable(env, table) {
const all = [];
let offset = null;

do {
const url = new URL(
https://api.airtable.com/v0/${BASE}/${table.id}
);

url.searchParams.set("pageSize", "100");

if (offset) {
url.searchParams.set("offset", offset);
}

const res = await fetch(url, {
headers: {
Authorization: Bearer ${env.AIRTABLE_TOKEN}`
}
});

if (!res.ok) {
const text = await res.text();
throw new Error(Airtable${res.status}: ${text}`);
}

const data = await res.json();

all.push(...(data.records || []));
offset = data.offset || null;

} while (offset);

return all;
}

function firstAttachmentUrl(value) {
if (!Array.isArray(value) || !value.length) return "";
return value[0]?.url || "";
}

function mapRecord(record, kind) {
const f = record.fields || {};

return {
id: record.id,
name: f["Name"] || "",
type:
kind === "ropa"
? (f["Tipo"] || "")
: (f["Tipo de accesorio"] || ""),
colors:
kind === "ropa"
? (Array.isArray(f["Colores"]) ? f["Colores"] : [])
: [],
price: Number(f["Precio de venta"] || 0),
stock: Number(f["Unidades disponibles"] || 0),
image: firstAttachmentUrl(f["Imagen"])
};
}

async function getProducts(env) {
const [ropaRecords, accesoriosRecords] = await Promise.all([
airtableTable(env, TABLES.ropa),
airtableTable(env, TABLES.accesorios)
 ]);

return {
ropa: ropaRecords.map(record => mapRecord(record, "ropa")),
accesorios: accesoriosRecords.map(record => mapRecord(record, "accesorios")),
updatedAt: new Date().toISOString()
};
}

export default {
async fetch(request, env) {
const url = new URL(request.url);

if (url.pathname === "/api/products") {
try {
if (!env.AIRTABLE_TOKEN) {
throw new Error("Falta configurar el secreto AIRTABLE_TOKEN en Cloudflare.");
}

const products = await getProducts(env);

return Response.json(products, {
headers: {
"Cache-Control": "no-store",
"Access-Control-Allow-Origin": "*"
}
});

} catch (error) {
console.error(error);

return Response.json(
{
error: String(error?.message || error)
},
{
status: 500,
headers: {
"Cache-Control": "no-store",
"Access-Control-Allow-Origin": "*"
}
}
);
}
}

return env.ASSETS.fetch(request);
}
};
