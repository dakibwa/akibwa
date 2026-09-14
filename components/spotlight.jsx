"use client";

import { createContext, useContext } from "react";

// Which homepage chapter the masthead links have brought forward, if any.
export const SpotlightContext = createContext({ spotlight: null, setSpotlight: null });
export const useSpotlight = () => useContext(SpotlightContext);
