# WeatherApp

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

Start the development server:

```bash
npx expo start
```

Or run on specific platforms:

- **Android**: `npx expo start --android`
- **iOS**: `npx expo start --ios`
- **Web**: `npx expo start --web`

## Troubleshooting

If you have trouble connecting your phone to the development server (e.g., "Something went wrong" or connection timeouts), try running with the tunnel flag:

```bash
npx expo start --tunnel --clear
```

This is often necessary if your phone and computer are on different networks or if your Wi-Fi blocks device-to-device communication.

