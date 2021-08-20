import uuid from "react-uuid";

class House {
  constructor(coordinates, occupants = [], damage = 0) {
    this.id = uuid();
    this.damage = damage;
    this.coordinates = coordinates;
    this.occupants = occupants;
    this.finishedInspection = false;
    this.inspecting = false;
    this.rebuilding = false;
    this.haveToRebuild = false;
    this.inspectionBuffer = Math.floor(Math.random() * 30);
  }

  addOccupants(occupants) {
    this.occupants = [
      ...this.occupants,
      ...occupants.map((occupant) => occupant.id),
    ];
    occupants.forEach((occupant) => {
      occupant.house = this.id;
    });
  }

  removeOccupants(occupants) {
    this.occupants = this.occupants.filter(
      (occupant) =>
        !occupants.map((occupant) => occupant.id).includes(occupant.id)
    );
    occupants.forEach((occupant) => {
      occupant.house = null;
    });
  }
}

export default House;
