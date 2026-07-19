from neo4j import GraphDatabase

uri = "neo4j+s://b06b97af.databases.neo4j.io"
password = "UTG36R7V5iIyUq5DRX3b4PKf-iX3rcqq7M4Ftc1i9Wg"

try:
    driver = GraphDatabase.driver(uri, auth=("neo4j", password))
    with driver.session() as session:
        print("neo4j user success:", session.run("RETURN 1").single()[0])
except Exception as e:
    print("neo4j error:", e)

try:
    driver = GraphDatabase.driver(uri, auth=("b06b97af", password))
    with driver.session() as session:
        print("b06b97af user success:", session.run("RETURN 1").single()[0])
except Exception as e:
    print("b06b97af error:", e)
