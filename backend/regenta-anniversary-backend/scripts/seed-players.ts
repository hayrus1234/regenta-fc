
import "dotenv/config";
import { db, pool } from "../src/db/client.js";
import { players } from "../src/db/schema/players.js";
import { inArray } from "drizzle-orm";

const names = [
  "Arjun", "Vikram", "Karthik", "Pranav",
  "Adithya", "Surya", "Rohit", "Varun",
  "Dinesh", "Harish", "Naveen", "Rahul",
  "Sanjay", "Akash", "Manoj", "Vishal",
  "Praveen", "Sathish", "Gokul", "Ashwin",
  "Bharath", "Deepak", "Ganesh", "Hari",
  "Jeevan", "Kavin", "Lokesh", "Madhan",
  "Nithin", "Pradeep", "Ramesh", "Sriram",
  "Ajay", "Balaji", "Charan", "Darshan",
  "Ezhil", "Farhan", "Gautham", "Irfan",
  "Jagan", "Kishore", "Mohan", "Nikhil",
  "Omkar", "Parthiban", "Qadir", "Rajesh",
  "Siddharth", "Tarun", "Uday", "Vasanth",
  "Wasim", "Yogesh", "Abhinav", "Chandru",
  "Dharun", "Elango", "Faizal", "Girish",
  "Hemanth", "Imran", "Jithin", "Kamal"
];

async function seedPlayers() {
  try {
    const existing = await db
      .select({ displayName: players.displayName })
      .from(players);

    const existingNames = new Set(
      existing.map(p => p.displayName.toLowerCase())
    );

    const newPlayers = names
      .filter(name => !existingNames.has(name.toLowerCase()))
      .map(name => ({
        displayName: name,
        gameUid: null,
        contact: null,
        avatarUrl: null
      }));

    if (newPlayers.length === 0) {
      console.log("All test players already exist.");
      return;
    }

    const inserted = await db
      .insert(players)
      .values(newPlayers)
      .returning();

    console.log(`Successfully inserted ${inserted.length} test players.`);
    console.log("Players:", inserted.map(p => p.displayName));
  } catch (error) {
    console.error("Player seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seedPlayers();
