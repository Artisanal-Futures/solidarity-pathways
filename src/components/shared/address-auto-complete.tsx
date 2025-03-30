"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import type { PlaceAutocompleteResult } from "@googlemaps/google-maps-services-js";

import type { Address } from "~/types/geolocation";
import { autocomplete, getLatLng } from "~/lib/google";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";

import { Button } from "../ui/button";

type Props = {
  onSelect: (address: Address) => void;
  initialAddress?: Address;
};

export const AddressAutoComplete = ({ onSelect, initialAddress }: Props) => {
  const [predictions, setPredictions] = useState<PlaceAutocompleteResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>(
    initialAddress?.formatted ?? "",
  );
  const [input, setInput] = useState("");
  const commandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (!isOpen || !input) return;

      const predictions = await autocomplete(input);
      setPredictions(predictions ?? []);
    };
    void fetchPredictions();
  }, [input, isOpen]);

  useEffect(() => {
    if (initialAddress) {
      setSelected(initialAddress.formatted);
    }
  }, [initialAddress]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchend", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchend", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (prediction: PlaceAutocompleteResult) => {
    const latLng = await getLatLng(prediction.place_id);

    if (latLng.length > 0 && latLng[0]) {
      const address = {
        formatted: latLng[0].formatted_address,
        latitude: latLng[0].geometry.location.lat,
        longitude: latLng[0].geometry.location.lng,
      };
      setSelected(latLng[0].formatted_address);
      onSelect(address);
      setIsOpen(false);
    } else {
      console.warn("Geocoding given address returned nothing...");
    }
  };
  console.log("selected", selected);
  return (
    <div className="relative w-full">
      <Button
        variant="outline"
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full justify-start text-left"
      >
        <MapPin className="mr-2 h-4 w-4" />
        {selected ? selected : "Select an address..."}
      </Button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full" ref={commandRef}>
          <Command>
            <CommandInput
              placeholder="Search for an address..."
              value={input}
              onValueChange={setInput}
              autoFocus
            />
            <CommandList>
              <CommandEmpty>No results found</CommandEmpty>
              <CommandGroup heading="Suggestions">
                {predictions.map((prediction) => (
                  <CommandItem
                    key={prediction.place_id}
                    onSelect={() => {
                      void handleSelect(prediction);
                    }}
                  >
                    {prediction.description}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};
