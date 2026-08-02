# Estágio 1: build do jar com Maven + JDK 25
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Copia primeiro só o que é necessário para baixar as dependências.
# Isso permite que o Docker reaproveite essa camada em cache nos próximos builds
# enquanto só o código-fonte (src/) mudar.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY src ./src
RUN ./mvnw package -DskipTests -B

# Estágio 2: runtime, só com o JRE (sem JDK/Maven) e o jar final
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
