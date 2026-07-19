from neo4j import GraphDatabase
uri = "neo4j+s://b06b97af.databases.neo4j.io"
pwd = "UTG36R7V5iIyUq5DRX3b4PKf-iX3rcqq7M4Ftc1i9Wg"
for user in ["neo4j", "b06b97af"]:
    try:
        driver = GraphDatabase.driver(uri, auth=(user, pwd))
        driver.verify_connectivity()
        print(f"SUCCESS with user: {user}")
        break
    except Exception as e:
        print(f"FAILED with user: {user}, error: {e}")
