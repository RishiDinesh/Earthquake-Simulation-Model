import { useEffect, useMemo, useRef, useState } from "react";
import ReactMapGL, {
  Layer,
  Source,
  WebMercatorViewport,
  FlyToInterpolator,
  Marker,
  Popup,
} from "react-map-gl";
import { featureCollection, lineString, point } from "@turf/helpers";
import { featureEach } from "@turf/meta";
import { EarthquakePhase } from "../../models/People";
import uuid from "react-uuid";
import {
  ambulanceSpeed,
  inspectionTruckSpeed,
  evacuationCenterBufferTime,
  FirstAidHealthIncrease,
  FirstAidMaxDuration,
  foodIncrease,
  foodTruckSpeed,
  getMedicalPriority,
  medicalHealthIncrease,
  populationHealthDropBeforeFirstAid,
  populationHealthDropBeforeMedicalCamp,
  reallocationRepair,
} from "../data/constants";
import useAlgorithm, { Algorithms } from "../algorithms";
import { getCoord } from "@turf/invariant";
import along from "@turf/along";
import distance from "@turf/distance";

const mapSettings = {
  dragPan: false,
  dragRotate: false,
  scrollZoom: false,
  touchZoom: false,
  touchRotate: false,
  keyboard: false,
  doubleClickZoom: false,
};

const layerProperties = {
  faultRegion: {
    id: "fault-region-layer",
    source: "fault-region-source",
    type: "fill",
    paint: {
      "fill-color": "red",
      "fill-opacity": 0.35,
    },
  },
  populationInFaultRegion: {
    id: "population-inside-layer",
    interactive: true,
    source: "population-inside-source",
    type: "circle",
    paint: {
      // "circle-color": "red",
      "circle-color": [
        "match",
        ["get", "currentPhase"],
        EarthquakePhase.EVACUATION,
        "red",
        EarthquakePhase.MEDICALCAMP,
        "green",
        EarthquakePhase.FOODDISTRIBUTION,
        "blue",
        "gray",
      ],
      // "circle-radius": 4,
      "circle-radius": [
        "case",
        ["boolean", ["get", "hasReachedDestination"]],
        0,
        4,
      ],
    },
  },
  populationSurrounding: {
    id: "population-outside-layer",
    interactive: true,
    source: "population-outside-source",
    type: "circle",
    paint: {
      "circle-color": "gray",
      "circle-radius": 4,
    },
  },
};

const Map = ({
  earthquakeId,
  mapBounds,
  faultRegion,
  populationInFaultRegion,
  updatePopulationInFaultRegion,
  populationSurrounding,
  housesInFaultRegion,
  housesSurrounding,
  evacuationCenters,
  updateLogs,
  firstAidCamp,
  medicalCamp,
  foodDistributionCenter,
  foodCenters,
  inspectionCenter,
  reallocationCenter,
  setIsCompleted,
  setInfo,
}) => {
  const mapContainerRef = useRef(null);
  const [viewport, setViewport] = useState({
    width: mapContainerRef.current ? mapContainerRef.current.offsetWidth : 800,
    height: mapContainerRef.current
      ? mapContainerRef.current.offsetHeight
      : 700,
    latitude: 28,
    longitude: 77,
    zoom: 3,
  });
  const [previousTick, setPreviousTick] = useState(performance.now());
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [selectedEvacuationCenter, setSelectedEvacuationCenter] =
    useState(null);
  const [selectedFoodCenter, setSelectedFoodCenter] = useState(null);
  const [firstAidCampIsSelected, setFirstAidCampIsSelected] = useState(false);
  const [medicalCampIsSelected, setMedicalIsSelected] = useState(false);
  const [reallocationCampIsSelected, setReallocationCampIsSelected] =
    useState(false);
  const [
    foodDistributionCenterIsSelected,
    setFoodDistributionCenterIsSelected,
  ] = useState(false);
  const [currentPersonInFirstAid, setCurrentPersonInFirstAid] = useState(null);
  const [ambulanceProperties, setAmbulanceProperties] = useState({
    position: null,
    destination: null,
    occupants: [],
  });
  const [foodTruckProperties, setFoodTruckProperties] = useState({
    position: null,
    destination: null,
  });
  const [inspectionTruckProperties, setInspectionTruckProperties] = useState({
    position: null,
    destination: null,
  });
  const evacuationScheduling = useAlgorithm(
    Algorithms.SJF,
    0,
    (activeProcess) => {
      const evacuationCenter = evacuationCenters.find(
        (evacuationCenter) =>
          evacuationCenter.id === activeProcess.evacuationCenter.id
      );
      console.log(evacuationCenter);
      setAmbulanceProperties({
        position: point(firstAidCamp.coordinates),
        destination: evacuationCenter,
        occupants: [],
      });
      updateLogs((logs) => [
        ...logs,
        `Evacuation for Evacuation Center #${activeProcess.evacuationCenter.id} has started!`,
      ]);
    },
    (activeProcess) =>
      console.log(
        `Evacuation for Evacuation Center #${
          activeProcess.evacuationCenter.id
        } underway for ${
          activeProcess.maxBurstTime - activeProcess.burstTime
        } mins.!`
      ),
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `Evacuation for Evacuation Center #${activeProcess.evacuationCenter.id} has been completed!`,
      ]);
      console.log(activeProcess);
      setInfo((info) => ({
        ...info,
        evacuation: [
          ...info.evacuation,
          {
            id: activeProcess.evacuationCenter.id,
            arrivalTime: activeProcess.arrivalTime,
            waitingTime: activeProcess.waitingTime,
            turnAroundTime: activeProcess.turnAroundTime,
            completionTime: activeProcess.completionTime,
            burstTime: activeProcess.maxBurstTime,
          },
        ],
      }));
    }
  );
  const firstAidScheduling = useAlgorithm(
    Algorithms.RR,
    FirstAidMaxDuration,
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `First-Aid for Person #${activeProcess.person.id} has started!`,
      ]);
      setCurrentPersonInFirstAid(activeProcess);
    },
    (activeProcess) => {
      // console.log(
      //   `First-Aid for Person #${activeProcess.person.id} is underway!`,
      //   activeProcess
      // );
      setCurrentPersonInFirstAid(activeProcess);
      const updatedPopulationInFaultRegion = [
        ...populationInFaultRegion.features,
      ];
      const personIndex = updatedPopulationInFaultRegion.findIndex(
        (person) => person.properties.id === activeProcess.person.id
      );
      updatedPopulationInFaultRegion[personIndex].properties.health +=
        FirstAidHealthIncrease + populationHealthDropBeforeFirstAid;
      if (updatedPopulationInFaultRegion[personIndex].properties.health > 100)
        updatedPopulationInFaultRegion[personIndex].properties.health = 100;

      updatePopulationInFaultRegion(
        featureCollection(updatedPopulationInFaultRegion)
      );
    },
    (activeProcess) => {
      if (
        !currentPersonInFirstAid ||
        currentPersonInFirstAid.person.currentPhase !== EarthquakePhase.FIRSTAID
      )
        return;
      let currentProcess = { ...activeProcess };
      if (!activeProcess.person) {
        currentProcess = {
          ...currentPersonInFirstAid,
          completionTime: activeProcess.completionTime,
        };
        currentProcess.turnAroundTime =
          currentProcess.completionTime - currentProcess.arrivalTime;
        currentProcess.waitTime =
          currentProcess.turnAroundTime - currentProcess.maxBurstTime;
        console.log("Person not found!", currentProcess);
      }

      console.log("Current person", currentProcess);
      setCurrentPersonInFirstAid(null);

      updateLogs((logs) => [
        ...logs,
        `First-Aid for Person #${currentProcess.person.id} has been completed!`,
      ]);
      const updatedPopulationInFaultRegion = [
        ...populationInFaultRegion.features,
      ];
      const personIndex = updatedPopulationInFaultRegion.findIndex(
        (person) => person.properties.id === currentProcess.person.id
      );
      updatedPopulationInFaultRegion[personIndex].properties.destination =
        medicalCamp;
      updatedPopulationInFaultRegion[
        personIndex
      ].properties.hasReachedDestination = false;
      updatedPopulationInFaultRegion[personIndex].properties.currentPhase =
        EarthquakePhase.MEDICALCAMP;

      firstAidCamp.removeOccupant(currentProcess.person.id);

      updatePopulationInFaultRegion(
        featureCollection(updatedPopulationInFaultRegion)
      );

      setInfo((info) => ({
        ...info,
        firstAid: {
          ...info.firstAid,
          [currentProcess.person.id]: {
            arrivalTime: currentProcess.arrivalTime,
            waitingTime: currentProcess.waitingTime,
            turnAroundTime: currentProcess.turnAroundTime,
            completionTime: currentProcess.completionTime,
            burstTime: currentProcess.maxBurstTime,
          },
        },
      }));
    }
  );
  const medicalCampScheduling = useAlgorithm(
    Algorithms.P,
    0,
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `Medical Checkup for Person #${activeProcess.person.id} has started!`,
      ]);
    },
    (activeProcess) => {
      console.log(
        `Medical Checkup for Person #${activeProcess.person.id} is underway!`,
        activeProcess
      );
      const updatedPopulationInFaultRegion = [
        ...populationInFaultRegion.features,
      ];
      const personIndex = updatedPopulationInFaultRegion.findIndex(
        (person) => person.properties.id === activeProcess.person.id
      );
      updatedPopulationInFaultRegion[personIndex].properties.health +=
        medicalHealthIncrease + populationHealthDropBeforeMedicalCamp;
      if (updatedPopulationInFaultRegion[personIndex].properties.health > 100)
        updatedPopulationInFaultRegion[personIndex].properties.health = 100;
      updatePopulationInFaultRegion(
        featureCollection(updatedPopulationInFaultRegion)
      );
    },
    (activeProcess) => {
      if (!activeProcess.person)
        console.log("Person not found!", activeProcess);
      if (activeProcess.person) {
        updateLogs((logs) => [
          ...logs,
          `Medical Checkup for Person #${activeProcess.person.id} has been completed!`,
        ]);
        const updatedPopulationInFaultRegion = [
          ...populationInFaultRegion.features,
        ];
        const personIndex = updatedPopulationInFaultRegion.findIndex(
          (person) => person.properties.id === activeProcess.person.id
        );
        updatedPopulationInFaultRegion[personIndex].properties.destination =
          foodDistributionCenter;
        updatedPopulationInFaultRegion[
          personIndex
        ].properties.hasReachedDestination = false;
        updatedPopulationInFaultRegion[personIndex].properties.currentPhase =
          EarthquakePhase.FOODDISTRIBUTION;

        medicalCamp.removeOccupant(activeProcess.person.id);

        updatePopulationInFaultRegion(
          featureCollection(updatedPopulationInFaultRegion)
        );

        setInfo((info) => ({
          ...info,
          medicalCamp: {
            ...info.medicalCamp,
            [activeProcess.person.id]: {
              arrivalTime: activeProcess.arrivalTime,
              waitingTime: activeProcess.waitingTime,
              turnAroundTime: activeProcess.turnAroundTime,
              completionTime: activeProcess.completionTime,
              burstTime: activeProcess.maxBurstTime,
            },
          },
        }));
      }
    }
  );
  const foodCollectionScheduling = useAlgorithm(
    Algorithms.SJF,
    0,
    (activeProcess) => {
      console.log(activeProcess.foodCenter);
      setFoodTruckProperties({
        position: point(foodDistributionCenter.coordinates),
        destination: activeProcess.foodCenter,
      });
      updateLogs((logs) => [
        ...logs,
        `Collection from Food Center #${activeProcess.foodCenter.id} has started!`,
      ]);
    },
    (activeProcess) =>
      console.log(
        `Collection from Food Center #${
          activeProcess.foodCenter.id
        } underway for ${
          activeProcess.maxBurstTime - activeProcess.burstTime
        } mins.!`
      ),
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `Collection from Food Center #${activeProcess.foodCenter.id} has been completed!`,
      ]);
      setInfo((info) => ({
        ...info,
        foodCollection: [
          ...info.foodCollection,
          {
            id: activeProcess.foodCenter.id,
            arrivalTime: activeProcess.arrivalTime,
            waitingTime: activeProcess.waitingTime,
            turnAroundTime: activeProcess.turnAroundTime,
            completionTime: activeProcess.completionTime,
            burstTime: activeProcess.maxBurstTime,
          },
        ],
      }));
    }
  );
  const foodDistributionScheduling = useAlgorithm(
    Algorithms.P,
    0,
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `Food Distribution for Person #${activeProcess.person.id} has started!`,
      ]);
    },
    (activeProcess) => {
      console.log(
        `Food Distribution for Person #${activeProcess.person.id} is underway!`,
        activeProcess
      );
      const updatedPopulationInFaultRegion = [
        ...populationInFaultRegion.features,
      ];
      const personIndex = updatedPopulationInFaultRegion.findIndex(
        (person) => person.properties.id === activeProcess.person.id
      );
      updatedPopulationInFaultRegion[personIndex].properties.energy +=
        foodIncrease;
      if (updatedPopulationInFaultRegion[personIndex].properties.energy > 10)
        updatedPopulationInFaultRegion[personIndex].properties.energy = 10;
      updatePopulationInFaultRegion(
        featureCollection(updatedPopulationInFaultRegion)
      );
    },
    (activeProcess) => {
      if (!activeProcess.person) {
        console.log("Person not found!", activeProcess);
      }
      if (activeProcess.person) {
        updateLogs((logs) => [
          ...logs,
          `Food Distribution for Person #${activeProcess.person.id} has been completed!`,
        ]);
        const updatedPopulationInFaultRegion = [
          ...populationInFaultRegion.features,
        ];
        const personIndex = updatedPopulationInFaultRegion.findIndex(
          (person) => person.properties.id === activeProcess.person.id
        );
        updatedPopulationInFaultRegion[personIndex].properties.destination =
          reallocationCenter;
        updatedPopulationInFaultRegion[
          personIndex
        ].properties.hasReachedDestination = false;
        updatedPopulationInFaultRegion[personIndex].properties.currentPhase =
          EarthquakePhase.REALLOCATION;

        foodDistributionCenter.removeOccupant(activeProcess.person.id);

        updatePopulationInFaultRegion(
          featureCollection(updatedPopulationInFaultRegion)
        );

        setInfo((info) => ({
          ...info,
          foodDistribution: {
            ...info.foodDistribution,
            [activeProcess.person.id]: {
              arrivalTime: activeProcess.arrivalTime,
              waitingTime: activeProcess.waitingTime,
              turnAroundTime: activeProcess.turnAroundTime,
              completionTime: activeProcess.completionTime,
              burstTime: activeProcess.maxBurstTime,
            },
          },
        }));
      }
    }
  );
  const inspectionScheduling = useAlgorithm(
    Algorithms.FCFS,
    0,
    (activeProcess) => {
      console.log(activeProcess.house);
      setInspectionTruckProperties({
        position: point(inspectionCenter.coordinates),
        destination: activeProcess.house,
      });
      updateLogs((logs) => [
        ...logs,
        `Inspection for House #${activeProcess.house.id} has started!`,
      ]);
    },
    (activeProcess) =>
      console.log(
        `Inspection for House #${activeProcess.house.id} underway for ${
          activeProcess.maxBurstTime - activeProcess.burstTime
        } mins.!`
      ),
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `Inspection for House #${activeProcess.house.id} has been completed!`,
      ]);
      if (activeProcess.house.damage > 50)
        activeProcess.house.haveToRebuild = true;
      activeProcess.house.inspecting = false;
      activeProcess.house.finishedInspection = true;
      setInfo((info) => ({
        ...info,
        inspection: [
          ...info.inspection,
          {
            id: activeProcess.house.id,
            arrivalTime: activeProcess.arrivalTime,
            waitingTime: activeProcess.waitingTime,
            turnAroundTime: activeProcess.turnAroundTime,
            completionTime: activeProcess.completionTime,
            burstTime: activeProcess.maxBurstTime,
          },
        ],
      }));
    }
  );
  const rebuildScheduling = useAlgorithm(
    Algorithms.SJF,
    0,
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `Rebuilding House #${activeProcess.house.id} has started!`,
      ]);
    },
    (activeProcess) => {
      console.log(
        `Rebuilding House #${activeProcess.house.id} underway for ${
          activeProcess.maxBurstTime - activeProcess.burstTime
        } mins.!`
      );
      activeProcess.house.damage -= reallocationRepair;
    },
    (activeProcess) => {
      updateLogs((logs) => [
        ...logs,
        `Rebuilding House #${activeProcess.house.id} has been completed!`,
      ]);
      activeProcess.house.haveToRebuild = false;
      activeProcess.house.rebuilding = false;
      setInfo((info) => ({
        ...info,
        rebuilding: [
          ...info.rebuilding,
          {
            id: activeProcess.house.id,
            arrivalTime: activeProcess.arrivalTime,
            waitingTime: activeProcess.waitingTime,
            turnAroundTime: activeProcess.turnAroundTime,
            completionTime: activeProcess.completionTime,
            burstTime: activeProcess.maxBurstTime,
          },
        ],
      }));
    }
  );
  const [peopleCompleted, setPeopleCompleted] = useState(0);

  // console.log(peopleCompleted, populationInFaultRegion.features.length);

  useEffect(() => {
    if (
      populationInFaultRegion &&
      peopleCompleted === populationInFaultRegion.features.length
    ) {
      setIsCompleted(true);
      setInfo((info) => ({
        ...info,
        completedAt: performance.now(),
        survivorsCount: populationInFaultRegion.features.length,
      }));
    }
  }, [peopleCompleted]);

  const moveAmbulance = (deltaTime) => {
    if (!ambulanceProperties.destination)
      return [false, ambulanceProperties.position];

    const destinationCoordinates = ambulanceProperties.destination.coordinates;
    const currentCoordinates = getCoord(ambulanceProperties.position);

    const lineStringToDestination = lineString([
      currentCoordinates,
      destinationCoordinates,
    ]);
    const newCoordinates = along(
      lineStringToDestination,
      ambulanceSpeed * deltaTime,
      {
        units: "kilometers",
      }
    );

    if (destinationCoordinates === getCoord(newCoordinates)) {
      return [true, newCoordinates];
    }

    return [false, newCoordinates];
  };
  const moveFoodTruck = (deltaTime) => {
    if (!foodTruckProperties.destination)
      return [false, foodTruckProperties.position];

    const destinationCoordinates = foodTruckProperties.destination.coordinates;
    const currentCoordinates = getCoord(foodTruckProperties.position);

    const lineStringToDestination = lineString([
      currentCoordinates,
      destinationCoordinates,
    ]);
    const newCoordinates = along(
      lineStringToDestination,
      foodTruckSpeed * deltaTime,
      {
        units: "kilometers",
      }
    );

    if (destinationCoordinates === getCoord(newCoordinates)) {
      return [true, newCoordinates];
    }

    return [false, newCoordinates];
  };
  const moveInspectionTruck = (deltaTime) => {
    if (!inspectionTruckProperties.destination)
      return [false, inspectionTruckProperties.position];

    const destinationCoordinates =
      inspectionTruckProperties.destination.coordinates;
    const currentCoordinates = getCoord(inspectionTruckProperties.position);

    const lineStringToDestination = lineString([
      currentCoordinates,
      destinationCoordinates,
    ]);
    const newCoordinates = along(
      lineStringToDestination,
      foodTruckSpeed * deltaTime,
      {
        units: "kilometers",
      }
    );

    if (destinationCoordinates === getCoord(newCoordinates)) {
      return [true, newCoordinates];
    }

    return [false, newCoordinates];
  };

  useEffect(() => {
    const animation = window.requestAnimationFrame(() => {
      if (!earthquakeId) return;

      const currentTick = performance.now();
      const deltaTime = (currentTick - previousTick) / 1000;

      executePhaseActions(deltaTime);

      const foodCentersReadyForCollection = [],
        housesReadyForInspection = [],
        housesReadyForRebuilding = [];
      foodCenters.forEach((foodCenter) => {
        if (foodCenter.isReadyForCollection()) {
          foodCenter.collected = true;
          const distanceToTravel = Math.ceil(
            (2 *
              distance(
                point(foodCenter.coordinates),
                point(foodDistributionCenter.coordinates),
                { units: "kilometers" }
              )) /
              foodTruckSpeed
          );
          const process = {
            foodCenter,
            id: uuid(),
            burstTime: distanceToTravel,
            maxBurstTime: distanceToTravel,
          };
          foodCentersReadyForCollection.push(process);
        }
      });
      housesInFaultRegion.forEach((house) => {
        if (!house.finishedInspection && !house.inspecting) {
          house.inspectionBuffer -= deltaTime;
          if (house.inspectionBuffer < 0) house.inspectionBuffer = 0;

          if (house.inspectionBuffer <= 0) {
            const distanceToTravel = Math.ceil(
              (2 *
                distance(
                  point(house.coordinates),
                  point(inspectionCenter.coordinates),
                  { units: "kilometers" }
                )) /
                inspectionTruckSpeed
            );
            const process = {
              house,
              id: uuid(),
              burstTime: distanceToTravel,
              maxBurstTime: distanceToTravel,
            };
            house.inspecting = true;
            housesReadyForInspection.push(process);
          }
        }

        if (house.haveToRebuild && !house.rebuilding) {
          house.rebuilding = true;
          const distanceToTravel = Math.ceil(
            (house.damage - 49.8) / reallocationRepair
          );
          const process = {
            house,
            id: uuid(),
            burstTime: distanceToTravel,
            maxBurstTime: distanceToTravel,
          };
          housesReadyForRebuilding.push(process);
        }
      });
      if (foodCentersReadyForCollection.length > 0)
        foodCollectionScheduling.addToQueue(foodCentersReadyForCollection);
      if (housesReadyForInspection.length > 0)
        inspectionScheduling.addToQueue(housesReadyForInspection);
      if (housesReadyForRebuilding.length > 0) {
        rebuildScheduling.addToQueue(housesReadyForRebuilding);
      }

      // Move the ambulance
      if (ambulanceProperties.destination) {
        const [reached, position] = moveAmbulance(deltaTime);

        let destination = ambulanceProperties.destination,
          occupants = ambulanceProperties.occupants;
        if (reached) {
          if (destination !== firstAidCamp) {
            occupants = destination.occupants;
            destination.occupants = [];
            destination.isTransporting = false;
            destination = firstAidCamp;
          } else {
            const firstAidPopulation = [];
            const updatedPopulationInFaultRegion =
              populationInFaultRegion.features.map((feature) => {
                let person = { ...feature };
                if (
                  occupants.filter(
                    (occupant) => occupant === person.properties.id
                  ).length > 0
                ) {
                  person.properties.coordinates = firstAidCamp.coordinates;
                  person.geometry.coordinates = firstAidCamp.coordinates;
                  person.properties.currentPhase = EarthquakePhase.FIRSTAID;
                  person.properties.destination = null;
                  person.properties.hasReachedDestination = true;
                  const burstTime = Math.ceil(
                    person.properties.health / FirstAidHealthIncrease / 2
                  );
                  firstAidPopulation.push({
                    person: person.properties,
                    id: uuid(),
                    burstTime,
                    maxBurstTime: burstTime,
                  });
                }
                return person;
              });
            updatePopulationInFaultRegion(
              featureCollection(updatedPopulationInFaultRegion)
            );
            firstAidScheduling.addToQueue(firstAidPopulation);

            firstAidCamp.addOccupants(occupants);
            occupants = [];
            destination = null;
          }
        }

        setAmbulanceProperties({
          destination,
          position,
          occupants,
        });
      }
      // Move the food truck
      if (foodTruckProperties.destination) {
        const [reached, position] = moveFoodTruck(deltaTime);

        let destination = foodTruckProperties.destination;
        if (reached) {
          if (destination !== foodDistributionCenter) {
            destination = foodDistributionCenter;
          } else {
            destination = null;
          }
        }

        setFoodTruckProperties({
          destination,
          position,
        });
      }
      // Move the inspection truck
      if (inspectionTruckProperties.destination) {
        const [reached, position] = moveInspectionTruck(deltaTime);

        let destination = inspectionTruckProperties.destination;
        if (reached) {
          if (destination !== inspectionCenter) {
            destination = inspectionCenter;
          } else {
            destination = null;
          }
        }

        setInspectionTruckProperties({
          destination,
          position,
        });
      }

      setPreviousTick(currentTick);
    });
    return () => window.cancelAnimationFrame(animation);
  });

  useEffect(() => {
    if (!earthquakeId) return;

    const [minLng, minLat, maxLng, maxLat] = mapBounds;
    const vp = new WebMercatorViewport(viewport);
    const { longitude, latitude, zoom } = vp.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 24 }
    );
    // console.log(earthquakeId, zoom);

    setViewport((viewport) => ({
      ...viewport,
      longitude,
      latitude,
      zoom: zoom,
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  }, [earthquakeId]);

  const getCursor = ({ isHovering, isDragging }) =>
    isDragging ? "grabbing" : isHovering ? "pointer" : "default";

  const handleViewportChange = (newViewport) => {
    setViewport((viewport) => ({
      ...viewport,
      ...newViewport,
      transitionDuration: 1000,
      transitionInterpolator: new FlyToInterpolator(),
    }));
  };

  const executePhaseActions = (deltaTime) => {
    // Move people if there is a destination
    let updatedPopulationInside = [];
    let evacuationCentersToEvacuate = [];
    let medicalQueue = [];
    let foodDistributionQueue = [];

    let updated, reached;
    featureEach(populationInFaultRegion, (person) => {
      [reached, updated] = person.properties.moveToDestination(deltaTime);

      // Phase actions
      const personProps = person.properties;

      personProps.updateHealth(deltaTime);
      //#region Phase Actions
      if (personProps.currentPhase === EarthquakePhase.EVACUATION) {
        const evacuationCenter = personProps.destination;
        if (evacuationCenter.isReadyForEvacuation()) {
          const distanceToTravel = Math.ceil(
            (2 *
              distance(
                point(evacuationCenter.coordinates),
                point(firstAidCamp.coordinates),
                { units: "kilometers" }
              )) /
              ambulanceSpeed
          );
          const process = {
            evacuationCenter,
            id: uuid(),
            burstTime: distanceToTravel,
            maxBurstTime: distanceToTravel,
          };
          evacuationCenter.waitingTimeBeforeEvacuation =
            evacuationCenterBufferTime;
          evacuationCenter.isTransporting = true;
          evacuationCentersToEvacuate.push(process);
          updateLogs((logs) => [
            ...logs,
            `Evacuation Center #${evacuationCenter.id} requesting evacuation!`,
          ]);
        }

        if (reached) {
          if (!personProps.hasReachedDestination) {
            personProps.destination.addOccupant(personProps.id);
            personProps.hasReachedDestination = true;
          }
        }
      } else if (personProps.currentPhase === EarthquakePhase.MEDICALCAMP) {
        if (reached) {
          if (!personProps.hasReachedDestination) {
            personProps.destination.addOccupant(personProps.id);
            personProps.hasReachedDestination = true;

            const burstTime = Math.ceil(
              (100 - personProps.health) / medicalHealthIncrease
            );
            const process = {
              person: personProps,
              id: uuid(),
              burstTime,
              maxBurstTime: burstTime,
              priority: getMedicalPriority(
                personProps.age,
                personProps.gender,
                personProps.health
              ),
            };
            medicalQueue.push(process);
          }
        }
      } else if (
        personProps.currentPhase === EarthquakePhase.FOODDISTRIBUTION
      ) {
        if (reached) {
          if (!personProps.hasReachedDestination) {
            personProps.destination.addOccupant(personProps.id);
            personProps.hasReachedDestination = true;

            const burstTime = Math.ceil(
              (10 - personProps.energy) / foodIncrease
            );
            const process = {
              person: personProps,
              id: uuid(),
              burstTime,
              maxBurstTime: burstTime,
              priority: getMedicalPriority(
                personProps.age,
                personProps.gender,
                personProps.energy
              ),
            };
            foodDistributionQueue.push(process);
          }
        }

        if (
          personProps.id in foodDistributionCenter.occupants &&
          foodDistributionScheduling.pendingQueue.length === 0 &&
          !foodDistributionScheduling.activeProcess
        ) {
          return;
        }
      } else if (personProps.currentPhase === EarthquakePhase.REALLOCATION) {
        if (personProps.destination === reallocationCenter) {
          if (
            personProps.house.finishedInspection &&
            !personProps.house.haveToRebuild
          ) {
            reallocationCenter.removeOccupant(personProps.id);
            personProps.destination = personProps.house;
            personProps.hasReachedDestination = false;
          }
        }

        if (reached) {
          if (!personProps.hasReachedDestination) {
            personProps.destination.addOccupants([personProps]);
            personProps.hasReachedDestination = true;

            if (personProps.destination !== reallocationCenter) {
              personProps.currentPhase = EarthquakePhase.COMPLETED;
              setPeopleCompleted((peopleCompleted) => peopleCompleted + 1);
              console.log("completed", peopleCompleted);
              if (peopleCompleted === populationInFaultRegion.features.length) {
                setIsCompleted(true);
                setInfo((info) => ({
                  ...info,
                  survivorsCount: populationInFaultRegion.features.length,
                  completedAt: performance.now(),
                }));
              }
            }
          }
        }
      }
      //#endregion

      updated.properties = personProps;
      if (personProps.id in ambulanceProperties.occupants) return;
      updatedPopulationInside.push(updated);
    });

    if (evacuationCentersToEvacuate.length > 0) {
      evacuationScheduling.addToQueue(evacuationCentersToEvacuate);
    }

    if (medicalQueue.length > 0) {
      medicalCampScheduling.addToQueue(medicalQueue);
    }

    if (foodDistributionQueue.length > 0) {
      foodDistributionScheduling.addToQueue(foodDistributionQueue);
    }
    // console.log(updatedPopulationInside[0]);
    updatePopulationInFaultRegion(featureCollection(updatedPopulationInside));
  };

  const HouseMarkersInsideFaultRegion = useMemo(
    () =>
      housesInFaultRegion &&
      housesInFaultRegion.map(
        ({ id, damage, coordinates: [longitude, latitude] }, index) => (
          <>
            <Marker
              key={`house-marker-${id}`}
              longitude={longitude}
              latitude={latitude}
              className="house-marker">
              {Math.ceil(damage) > 50 ? (
                <img
                  src="./home-damage.svg"
                  alt={`house-${id}`}
                  onClick={() => setSelectedHouse(housesInFaultRegion[index])}
                />
              ) : (
                <img
                  src="./home.svg"
                  alt={`house-${id}`}
                  onClick={() => setSelectedHouse(housesInFaultRegion[index])}
                />
              )}
            </Marker>
          </>
        )
      ),
    [housesInFaultRegion]
  );
  const HouseMarkersSurrouding = useMemo(
    () =>
      housesSurrounding &&
      housesSurrounding.map(
        ({ id, coordinates: [longitude, latitude] }, index) => (
          <>
            <Marker
              key={`house-marker-${id}`}
              longitude={longitude}
              latitude={latitude}
              className="house-marker">
              <img
                src="./home.svg"
                alt={`house-${id}`}
                onClick={() => setSelectedHouse(housesSurrounding[index])}
              />
            </Marker>
          </>
        )
      ),
    [housesSurrounding]
  );
  const EvacuationCenters = useMemo(
    () =>
      evacuationCenters &&
      evacuationCenters.map(
        ({ id, coordinates: [longitude, latitude] }, index) => (
          <>
            <Marker
              key={`house-marker-${id}`}
              longitude={longitude}
              latitude={latitude}
              className="house-marker">
              <img
                src="./evacuation.svg"
                alt={`house-${id}`}
                onClick={() =>
                  setSelectedEvacuationCenter(evacuationCenters[index])
                }
              />
            </Marker>
          </>
        )
      ),
    [evacuationCenters]
  );
  const FirstAidCamp = useMemo(
    () =>
      firstAidCamp && (
        <Marker
          key={`firstaid-marker`}
          longitude={firstAidCamp.coordinates[0]}
          latitude={firstAidCamp.coordinates[1]}
          className="house-marker">
          <img
            src="./first-aid.svg"
            alt={`first-aid`}
            onClick={() => setFirstAidCampIsSelected(true)}
          />
        </Marker>
      ),
    [firstAidCamp]
  );
  const MedicalCamp = useMemo(
    () =>
      medicalCamp && (
        <Marker
          key={`medicalcamp-marker`}
          longitude={medicalCamp.coordinates[0]}
          latitude={medicalCamp.coordinates[1]}
          className="house-marker">
          <img
            src="./medical-camp.svg"
            alt={`medical-camp`}
            onClick={() => setMedicalIsSelected(true)}
          />
        </Marker>
      ),
    [medicalCamp]
  );
  const FoodDistributionCenter = useMemo(
    () =>
      foodDistributionCenter && (
        <Marker
          key={`fooddistribution-marker`}
          longitude={foodDistributionCenter.coordinates[0]}
          latitude={foodDistributionCenter.coordinates[1]}
          className="house-marker">
          <img
            src="./medical-camp.svg"
            alt={`medical-camp`}
            onClick={() => setFoodDistributionCenterIsSelected(true)}
          />
        </Marker>
      ),
    [foodDistributionCenter]
  );
  const InspectionCenter = useMemo(
    () =>
      inspectionCenter && (
        <Marker
          key={`inspectioncenter-marker`}
          longitude={inspectionCenter.coordinates[0]}
          latitude={inspectionCenter.coordinates[1]}
          className="house-marker">
          <img src="./inspection.svg" alt={`inspection-center`} />
        </Marker>
      ),
    [inspectionCenter]
  );
  const ReallocationCenter = useMemo(
    () =>
      reallocationCenter && (
        <Marker
          key={`reallocationcenter-marker`}
          longitude={reallocationCenter.coordinates[0]}
          latitude={reallocationCenter.coordinates[1]}
          className="house-marker">
          <img
            src="./reallocation.svg"
            alt={`reallocation-center`}
            onClick={() => setReallocationCampIsSelected(true)}
          />
        </Marker>
      ),
    [reallocationCenter]
  );
  const FoodCenters = useMemo(
    () =>
      foodCenters &&
      foodCenters.map(({ id, coordinates: [longitude, latitude] }, index) => (
        <>
          <Marker
            key={`foodcenter-marker-${id}`}
            longitude={longitude}
            latitude={latitude}
            className="house-marker">
            <img
              src="./food-center.svg"
              alt={`food-center-${id}`}
              onClick={() => setSelectedFoodCenter(foodCenters[index])}
            />
          </Marker>
        </>
      )),
    [foodCenters]
  );
  const Ambulance = useMemo(
    () =>
      ambulanceProperties.destination && (
        <Marker
          key={`ambulance-marker`}
          longitude={ambulanceProperties.position.geometry.coordinates[0]}
          latitude={ambulanceProperties.position.geometry.coordinates[1]}
          className="house-marker">
          <img src="./ambulance.svg" alt={`ambulance`} />
        </Marker>
      ),
    [ambulanceProperties]
  );
  const FoodTruck = useMemo(
    () =>
      foodTruckProperties.destination && (
        <Marker
          key={`foodtruck-marker`}
          longitude={foodTruckProperties.position.geometry.coordinates[0]}
          latitude={foodTruckProperties.position.geometry.coordinates[1]}
          className="house-marker">
          <img src="./ambulance.svg" alt={`food truck`} />
        </Marker>
      ),
    [foodTruckProperties]
  );
  const InspectionTruck = useMemo(
    () =>
      inspectionTruckProperties.destination && (
        <Marker
          key={`inspectiontruck-marker`}
          longitude={inspectionTruckProperties.position.geometry.coordinates[0]}
          latitude={inspectionTruckProperties.position.geometry.coordinates[1]}
          className="house-marker">
          <img src="./truck.svg" alt={`inspection truck`} />
        </Marker>
      ),
    [inspectionTruckProperties]
  );

  return (
    <div className="scene" ref={mapContainerRef}>
      <ReactMapGL
        {...viewport}
        {...mapSettings}
        width="100%"
        height="100%"
        className="map-container"
        mapStyle="mapbox://styles/pranav5956/ckol34jvh6qpi18mu6mikta8y"
        mapboxApiAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
        clickRadius={2}
        getCursor={getCursor}
        onViewportChange={handleViewportChange}
        interactiveLayerIds={Object.keys(layerProperties)
          .filter((layer) => layerProperties[layer].interactive)
          .map((layer) => layerProperties[layer].id)}>
        {populationInFaultRegion && (
          <Source
            id={layerProperties.populationInFaultRegion.source}
            type="geojson"
            data={populationInFaultRegion}>
            <Layer {...layerProperties.populationInFaultRegion} />
          </Source>
        )}
        {faultRegion && (
          <Source
            id={layerProperties.faultRegion.source}
            type="geojson"
            data={faultRegion}>
            <Layer {...layerProperties.faultRegion} />
          </Source>
        )}
        {populationSurrounding && (
          <Source
            id={layerProperties.populationSurrounding.source}
            type="geojson"
            data={populationSurrounding}>
            <Layer {...layerProperties.populationSurrounding} />
          </Source>
        )}
        {HouseMarkersInsideFaultRegion}
        {HouseMarkersSurrouding}
        {EvacuationCenters}
        {FirstAidCamp}
        {MedicalCamp}
        {FoodCenters}
        {FoodDistributionCenter}
        {InspectionCenter}
        {ReallocationCenter}
        {Ambulance}
        {FoodTruck}
        {InspectionTruck}
        {selectedHouse && (
          <Popup
            className="map-popup"
            latitude={selectedHouse.coordinates[1]}
            longitude={selectedHouse.coordinates[0]}
            anchor="top"
            closeButton={true}
            closeOnClick={true}
            onClose={() => setSelectedHouse(null)}>
            <h3>House Information</h3>
            <p className="house-id">
              <span>ID: </span> {selectedHouse.id}
            </p>
            <p className="house-damage">
              <span>Damage: </span> {Math.ceil(selectedHouse.damage)}% (
              {selectedHouse.damage > 75
                ? "Severe"
                : selectedHouse.damage > 50
                ? "Moderate"
                : "Minimal"}
              )
            </p>
            <div className="house-damage-bar">
              <div
                className="house-damage-health"
                style={{
                  width: `calc(${100 - selectedHouse.damage}% - 4px)`,
                  background: `${
                    selectedHouse.damage > 75
                      ? "red"
                      : selectedHouse.damage > 50
                      ? "yellow"
                      : "yellowgreen"
                  }`,
                }}></div>
            </div>
            <p className="house-occupants">
              <span>Number of residents: </span>
              {selectedHouse.occupants.length}
            </p>
            <p className="house-occupants">
              <span>Time till inspection: </span>
              {Math.ceil(selectedHouse.inspectionBuffer)} mins.
            </p>
          </Popup>
        )}
        {selectedEvacuationCenter && (
          <Popup
            className="map-popup"
            latitude={selectedEvacuationCenter.coordinates[1]}
            longitude={selectedEvacuationCenter.coordinates[0]}
            anchor="top"
            closeButton={true}
            closeOnClick={true}
            onClose={() => setSelectedEvacuationCenter(null)}>
            <h3>Evacuation Center</h3>
            <p className="evacuation-center-id">
              <span>ID: </span> {selectedEvacuationCenter.id}
            </p>
            <p className="evacuation-center-occupants">
              <span>Number of Occupants: </span>
              {selectedEvacuationCenter.occupants.length}
            </p>
            <p className="evacuation-center-occupants">
              <span>Waiting-time before evacuation: </span>
              {selectedEvacuationCenter.waitingTimeBeforeEvacuation} mins.
            </p>
          </Popup>
        )}
        {firstAidCampIsSelected && (
          <Popup
            className="map-popup"
            latitude={firstAidCamp.coordinates[1]}
            longitude={firstAidCamp.coordinates[0]}
            anchor="top"
            closeButton={true}
            closeOnClick={true}
            onClose={() => setFirstAidCampIsSelected(false)}>
            <h3>First-Aid Camp</h3>
            <p className="evacuation-center-id">
              <span>ID: </span> {firstAidCamp.id}
            </p>
            <p className="evacuation-center-occupants">
              <span>Number of patients: </span>
              {firstAidCamp.occupants.length}
            </p>
          </Popup>
        )}
        {reallocationCampIsSelected && (
          <Popup
            className="map-popup"
            latitude={reallocationCenter.coordinates[1]}
            longitude={reallocationCenter.coordinates[0]}
            anchor="top"
            closeButton={true}
            closeOnClick={true}
            onClose={() => setReallocationCampIsSelected(false)}>
            <h3>Re-Allocation Camp</h3>
            <p className="evacuation-center-id">
              <span>ID: </span> {reallocationCenter.id}
            </p>
            <p className="evacuation-center-occupants">
              <span>Number of occupants: </span>
              {reallocationCenter.occupants.length}
            </p>
          </Popup>
        )}
        {medicalCampIsSelected && (
          <Popup
            className="map-popup"
            latitude={medicalCamp.coordinates[1]}
            longitude={medicalCamp.coordinates[0]}
            anchor="top"
            closeButton={true}
            closeOnClick={true}
            onClose={() => setMedicalIsSelected(false)}>
            <h3>Medical Camp</h3>
            <p className="evacuation-center-id">
              <span>ID: </span> {medicalCamp.id}
            </p>
            <p className="evacuation-center-occupants">
              <span>Number of patients: </span>
              {medicalCamp.occupants.length}
            </p>
          </Popup>
        )}
        {foodDistributionCenterIsSelected && (
          <Popup
            className="map-popup"
            latitude={foodDistributionCenter.coordinates[1]}
            longitude={foodDistributionCenter.coordinates[0]}
            anchor="top"
            closeButton={true}
            closeOnClick={true}
            onClose={() => setFoodDistributionCenterIsSelected(false)}>
            <h3>Food Distribution Center</h3>
            <p className="evacuation-center-id">
              <span>ID: </span> {foodDistributionCenter.id}
            </p>
            <p className="evacuation-center-occupants">
              <span>Occupants: </span>
              {foodDistributionCenter.occupants.length}
            </p>
          </Popup>
        )}
        {selectedFoodCenter && (
          <Popup
            className="map-popup"
            latitude={selectedFoodCenter.coordinates[1]}
            longitude={selectedFoodCenter.coordinates[0]}
            anchor="top"
            closeButton={true}
            closeOnClick={true}
            onClose={() => setSelectedFoodCenter(null)}>
            <h3>Food Center</h3>
            <p className="evacuation-center-id">
              <span>ID: </span> {selectedFoodCenter.id}
            </p>
            <p className="evacuation-center-occupants">
              <span>Time till supply call: </span>{" "}
              {selectedFoodCenter.waitingTimeBeforeCalling} mins.
            </p>
          </Popup>
        )}
      </ReactMapGL>
    </div>
  );
};

export default Map;
