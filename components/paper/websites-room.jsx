"use client";

import { ProjectShowcase } from "../project-showcase";

// The previous homepage's project cards, spotlit so every description prints.
export function WebsitesRoom({ sites }) {
  return (
    <div className="room-body websites">
      <ProjectShowcase projects={sites} spotlit label="Websites" />
    </div>
  );
}
