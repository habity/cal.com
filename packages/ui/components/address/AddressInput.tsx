import { useCallback, useEffect, useRef, useState } from "react";

import cx from "@calcom/ui/classNames";

import { Input } from "../form";
import { Icon } from "../icon";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

export type AddressInputProps = {
  value: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  onChange: (val: string) => void;
  className?: string;
  disabled?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TODO = any;

interface Prediction {
  placeId: string;
  text: { text: string };
  mainText?: { text: string };
  secondaryText?: { text: string };
  types: string[];
  toPlace: () => TODO;
}

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types: string[];
}

function parseAddressComponents(components: AddressComponent[]) {
  let street = "";
  let streetNumber = "";
  let city = "";
  let postalCode = "";

  for (const component of components) {
    const types = component.types;
    if (types.includes("street_number")) {
      streetNumber = component.longText || "";
    } else if (types.includes("route")) {
      street = component.longText || "";
    } else if (types.includes("postal_town") || types.includes("locality")) {
      city = component.longText || "";
    } else if (types.includes("postal_code")) {
      postalCode = component.longText || "";
    }
  }

  return { street, streetNumber, city, postalCode };
}

function formatAddress(parsed: ReturnType<typeof parseAddressComponents>) {
  const parts: string[] = [];
  if (parsed.street) {
    parts.push(
      parsed.streetNumber
        ? `${parsed.street} ${parsed.streetNumber}`
        : parsed.street
    );
  }
  if (parsed.postalCode || parsed.city) {
    parts.push([parsed.postalCode, parsed.city].filter(Boolean).join(" "));
  }
  return parts.join(", ");
}

function AddressInput({
  value,
  onChange,
  disabled,
  ...rest
}: AddressInputProps) {
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(!!value);
  const sessionTokenRef = useRef<TODO>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Rate limiting
  const requestTimestamps = useRef<number[]>([]);
  const totalRequests = useRef(0);
  const RATE_WINDOW_MS = 60_000;
  const MAX_REQUESTS_PER_WINDOW = 30;
  const MAX_SESSION_REQUESTS = 200;

  const isRateLimited = useCallback(() => {
    const now = Date.now();
    requestTimestamps.current = requestTimestamps.current.filter(
      (t) => now - t < RATE_WINDOW_MS
    );
    if (totalRequests.current >= MAX_SESSION_REQUESTS) return true;
    if (requestTimestamps.current.length >= MAX_REQUESTS_PER_WINDOW)
      return true;
    return false;
  }, []);

  const trackRequest = useCallback(() => {
    requestTimestamps.current.push(Date.now());
    totalRequests.current += 1;
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) return;

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existingScript) {
      if (window.google?.maps?.places) {
        setIsGoogleLoaded(true);
      } else {
        existingScript.addEventListener("load", () => setIsGoogleLoaded(true));
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=sv&region=SE&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGoogleLoaded(true);
    script.onerror = () => console.error("Failed to load Google Maps script");
    document.head.appendChild(script);
  }, []);

  // Create session token
  useEffect(() => {
    if (isGoogleLoaded && window.google?.maps?.places) {
      sessionTokenRef.current =
        new window.google.maps.places.AutocompleteSessionToken();
    }
  }, [isGoogleLoaded]);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value || "");
    setHasSelected(!!value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!isGoogleLoaded || input.length < 3 || isRateLimited()) {
        setPredictions([]);
        return;
      }

      try {
        const { suggestions } =
          await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            {
              input,
              includedRegionCodes: ["se"],
              includedPrimaryTypes: ["geocode"],
              language: "sv",
              sessionToken: sessionTokenRef.current,
            }
          );

        trackRequest();

        const excludedTypes = [
          "locality",
          "political",
          "administrative_area_level_1",
          "administrative_area_level_2",
          "administrative_area_level_3",
          "country",
          "neighborhood",
          "sublocality",
          "sublocality_level_1",
          "postal_code",
          "postal_town",
          "colloquial_area",
        ];

        const filtered = (suggestions || [])
          .filter((s: TODO) => s.placePrediction)
          .filter((s: TODO) => {
            const types: string[] = s.placePrediction.types || [];
            const hasAddressType = types.some((t: string) =>
              ["route", "street_address", "premise", "subpremise"].includes(t)
            );
            const isAreaOnly =
              !hasAddressType &&
              types.some((t: string) => excludedTypes.includes(t));
            return !isAreaOnly;
          })
          .map((s: TODO) => s.placePrediction as Prediction);

        setPredictions(filtered);
        setShowDropdown(filtered.length > 0);
        setActiveIndex(-1);
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        setPredictions([]);
      }
    },
    [isGoogleLoaded, isRateLimited, trackRequest]
  );

  const handleSelect = useCallback(
    async (prediction: Prediction) => {
      setShowDropdown(false);
      setPredictions([]);

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ["addressComponents", "formattedAddress", "location"],
        });

        const parsed = parseAddressComponents(place.addressComponents || []);
        const formatted = formatAddress(parsed);

        // Refresh session token
        sessionTokenRef.current =
          new window.google.maps.places.AutocompleteSessionToken();

        setInputValue(formatted);
        setHasSelected(true);
        onChange(formatted);
      } catch (error) {
        console.error("Error fetching place details:", error);
        // Fallback: use the prediction text
        const fallback = prediction.text.text;
        setInputValue(fallback);
        setHasSelected(true);
        onChange(fallback);
      }
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // When Google is active, don't propagate typed text to the form —
    // the form value only updates on selection. If cleared, reset form value.
    if (isGoogleLoaded) {
      if (val === "") {
        onChange("");
      }
    } else {
      onChange(val);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length >= 3 && isGoogleLoaded) {
      debounceRef.current = setTimeout(() => fetchPredictions(val), 300);
    } else {
      setPredictions([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <Icon
        name="map-pin"
        className="text-muted absolute left-0.5 ml-3 h-4 w-4 -translate-y-1/2"
        style={{ top: "44%" }}
      />
      <Input
        {...rest}
        autoComplete="off"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
        }}
        disabled={disabled}
        readOnly={isGoogleLoaded && hasSelected}
        className={cx(
          "pl-10",
          isGoogleLoaded && hasSelected ? "pr-8 cursor-default" : "",
          rest?.className
        )}
      />
      {isGoogleLoaded && hasSelected && inputValue && (
        <button
          type="button"
          className="text-muted hover:text-default absolute right-2 top-1/2 -translate-y-1/2"
          onClick={() => {
            setInputValue("");
            setHasSelected(false);
            onChange("");
            setPredictions([]);
            setShowDropdown(false);
          }}
          tabIndex={-1}
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      )}
      {showDropdown && predictions.length > 0 && (
        <ul
          className="border-subtle bg-default absolute top-full z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-lg"
          role="listbox"
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.placeId}
              role="option"
              aria-selected={index === activeIndex}
              className={cx(
                "cursor-pointer px-3 py-2 text-sm",
                index === activeIndex ? "bg-subtle" : "hover:bg-subtle"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(prediction);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="font-medium">
                {prediction.mainText?.text || prediction.text.text}
              </span>
              {prediction.secondaryText?.text && (
                <span className="text-muted ml-1">
                  {prediction.secondaryText.text}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressInput;
