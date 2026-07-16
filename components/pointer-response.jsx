"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

const interactionClasses = ["is-hovering", "is-pressing"];
const focusOriginClasses = ["is-pointer-focus"];

const clearInteraction = (element) => {
  element?.classList.remove(...interactionClasses);
};

const clearFocusOrigin = (element) => {
  element?.classList.remove(...focusOriginClasses);
};

const isWithin = (rect, clientX, clientY) => (
  clientX >= rect.left
  && clientX <= rect.right
  && clientY >= rect.top
  && clientY <= rect.bottom
);

export function usePointerResponse({ xProperty, yProperty } = {}) {
  const ref = useRef(null);
  const isTracking = useRef(false);

  const placeResponse = useCallback((event, element = ref.current) => {
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();

    if (xProperty) {
      element.style.setProperty(xProperty, `${event.clientX - rect.left}px`);
    }

    if (yProperty) {
      element.style.setProperty(yProperty, `${event.clientY - rect.top}px`);
    }

    return rect;
  }, [xProperty, yProperty]);

  const syncPointer = useCallback((event) => {
    const element = ref.current;

    if (!element || !isTracking.current) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const isInside = isWithin(rect, event.clientX, event.clientY);

    if (!isInside) {
      clearInteraction(element);
      isTracking.current = false;
      return;
    }

    placeResponse(event, element);
    element.classList.toggle("is-hovering", event.pointerType !== "touch");
    element.classList.toggle("is-pressing", Number(event.buttons) > 0);
  }, [placeResponse]);

  const startPointer = useCallback((event) => {
    isTracking.current = true;
    syncPointer(event);
  }, [syncPointer]);

  const finishPointer = useCallback((event) => {
    const element = ref.current;

    if (!element) {
      return;
    }

    element.classList.remove("is-pressing");

    if (event.pointerType === "touch") {
      element.classList.remove("is-hovering");
      isTracking.current = false;
      return;
    }

    const rect = element.getBoundingClientRect();
    const isInside = isWithin(rect, event.clientX, event.clientY);
    element.classList.toggle("is-hovering", isInside);
    isTracking.current = isInside;
  }, []);

  const resetPointer = useCallback(() => {
    isTracking.current = false;
    clearInteraction(ref.current);
  }, []);

  const blurResponse = useCallback(() => {
    isTracking.current = false;
    clearInteraction(ref.current);
    clearFocusOrigin(ref.current);
  }, []);

  useEffect(() => {
    const handlePointerOut = (event) => {
      if (!event.relatedTarget) {
        resetPointer();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        resetPointer();
      }
    };

    window.addEventListener("pointermove", syncPointer, true);
    window.addEventListener("pointerup", finishPointer, true);
    window.addEventListener("pointercancel", resetPointer, true);
    window.addEventListener("pointerout", handlePointerOut, true);
    window.addEventListener("blur", blurResponse);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pointermove", syncPointer, true);
      window.removeEventListener("pointerup", finishPointer, true);
      window.removeEventListener("pointercancel", resetPointer, true);
      window.removeEventListener("pointerout", handlePointerOut, true);
      window.removeEventListener("blur", blurResponse);
      document.removeEventListener("visibilitychange", handleVisibility);
      blurResponse();
    };
  }, [blurResponse, finishPointer, resetPointer, syncPointer]);

  return {
    ref,
    onPointerEnter: startPointer,
    onPointerMove: startPointer,
    onPointerLeave: resetPointer,
    onPointerDown: (event) => {
      isTracking.current = true;
      placeResponse(event);
      ref.current?.classList.add("is-pointer-focus");
      ref.current?.classList.toggle("is-hovering", event.pointerType !== "touch");
      ref.current?.classList.add("is-pressing");
    },
    onPointerUp: finishPointer,
    onPointerCancel: resetPointer,
    onLostPointerCapture: finishPointer,
    onDragEnd: finishPointer,
    onBlur: blurResponse
  };
}

const composeHandlers = (...handlers) => (event) => {
  handlers.forEach((handler) => handler?.(event));
};

export function PointerResponseLink({
  pointerXProperty,
  pointerYProperty,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onDragEnd,
  onBlur,
  ...props
}) {
  const pointer = usePointerResponse({
    xProperty: pointerXProperty,
    yProperty: pointerYProperty
  });

  return (
    <Link
      {...props}
      ref={pointer.ref}
      onPointerEnter={composeHandlers(pointer.onPointerEnter, onPointerEnter)}
      onPointerMove={composeHandlers(pointer.onPointerMove, onPointerMove)}
      onPointerLeave={composeHandlers(pointer.onPointerLeave, onPointerLeave)}
      onPointerDown={composeHandlers(pointer.onPointerDown, onPointerDown)}
      onPointerUp={composeHandlers(pointer.onPointerUp, onPointerUp)}
      onPointerCancel={composeHandlers(pointer.onPointerCancel, onPointerCancel)}
      onLostPointerCapture={composeHandlers(pointer.onLostPointerCapture, onLostPointerCapture)}
      onDragEnd={composeHandlers(pointer.onDragEnd, onDragEnd)}
      onBlur={composeHandlers(pointer.onBlur, onBlur)}
    />
  );
}
