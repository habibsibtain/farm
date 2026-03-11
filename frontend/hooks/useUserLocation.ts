import { useState, useEffect } from "react";
import * as Location from "expo-location";

export const useUserLocation = () => {
  const [location, setLocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});

      setLocation({
        lat: loc.coords.latitude,
        lon: loc.coords.longitude
      });
    };

    getLocation();
  }, []);

  return { location, errorMsg };
};