# Build
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

# Runtime
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/maresi-api-1.0.0.jar app.jar
ENV PORT=4000
EXPOSE 4000
ENTRYPOINT ["sh", "-c", "java -jar app.jar"]
