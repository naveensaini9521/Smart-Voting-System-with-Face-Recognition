from pymongo import MongoClient

# Connect to the local MongoDB server
client = MongoClient("mongodb://localhost:27017/")

# Create or connect to a database
db = client["smart_voting_system"]

# Create or connect to a collection (like a table)
users_collection = db["users"]

# Insert a sample record
user_data = {
    "name": "Admin",
    "email": "admin@example.com",
    "role": "admin"
}
users_collection.insert_one(user_data)

print("Database and collection created successfully!")
print("Databases available:", client.list_database_names())
print("Collections in 'smart_voting_system':", db.list_collection_names())
