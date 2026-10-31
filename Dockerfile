# =========================================
# STAGE 1 — BUILD ASP.NET CORE 10
# =========================================

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY . .

RUN dotnet restore "backend/WebChat.Api/WebChat.Api.csproj"

RUN dotnet publish "backend/WebChat.Api/WebChat.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false


# =========================================
# STAGE 2 — PRODUCTION RUNTIME
# =========================================

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:10000

EXPOSE 10000

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "WebChat.Api.dll"]