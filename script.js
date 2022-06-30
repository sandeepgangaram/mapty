'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _wokoutDescription() {
    // prettier-ignore

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._wokoutDescription();
  }

  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._wokoutDescription();
  }

  calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////////
////////////APP ARCHITECTURE ///////////////

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const resetButton = document.querySelector('.reset');

class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getLocalStorage();
    this._getPosition();
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField); //no need to bind as we are not using the this keyword inside this function
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    resetButton.addEventListener('click', this.reset);
  }

  _getPosition() {
    navigator.geolocation &&
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get the location');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(function () {
      form.style.display = 'grid';
    }, 1000);
  }
  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...data) =>
      data.every(input => Number.isFinite(input));
    const positiveValues = (...data) => data.every(input => input > 0);
    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;
    const { lat, lng } = this.#mapEvent.latlng;

    //If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveValues(distance, duration, cadence)
      )
        return alert('Inputs must be a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !positiveValues(distance, duration) //elevation can be negative if coming down a slope
      )
        return alert('Inputs must be a positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add new object to workout array
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Hide form + Clear input fieds
    this._hideForm();

    //store to localStorage
    this._setLocalStorage();

    //show reset button
    resetButton.classList.remove('hidden');
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 150,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const currentEl = e.target.closest('.workout');

    if (!currentEl) return;

    const workout = this.#workouts.find(
      work => work.id === currentEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });

    //Public interface method
    workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    // this.#workouts = data;
    //Because the object loses the prototypes once converted to string and back to object
    this.#workouts = data.map(work => {
      let obj;
      if (work.type === 'running') obj = new Running();
      if (work.type === 'cycling') obj = new Cycling();

      Object.assign(obj, work);
      return obj;
    });
    this.#workouts.forEach(workout => this._renderWorkout(workout));
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
// let map, mapEvent;

// navigator.geolocation &&
//   navigator.geolocation.getCurrentPosition(
//     function (position) {
//       const { latitude, longitude } = position.coords;
//       // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
//       const coords = [latitude, longitude];
//       map = L.map('map').setView(coords, 15); //'map' id attribute in html where we want the map to be rendered
//       // console.log(map);
//       // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
//         attribution:
//           '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
//       }).addTo(map);

//       // L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
//       //   maxZoom: 18,
//       //   subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
//       // }).addTo(map);

//       map.on('click', function (mapE) {
//         // console.log(mapEvent);
//         mapEvent = mapE;
//         form.classList.remove('hidden');
//         inputDistance.focus();
//       });
//     },
//     function () {
//       alert('Could not get the location');
//     }
//   );

//Any variable that is global in any script will be available on all the other scripts which are executed after that in the order by the browser (we can specify the order - ex:- L is global variable here by leaflet)
// You can use Google map view while still using Leaflet. It looks better with the Google map. I did it by following the below.
// I just copy and paste Tony's tip from another question:
// First of all, Leaflet is just a Viewing Library (API) and does not provide any maps at all. Maps are loaded from the URL you specify in L.tileLayer(). It uses OpenStreetMap as the default map provider, but you can use any other map provider you want...
// You can easily use Google Maps with just a few little tweaks:

//       L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
//         maxZoom: 18,
//         subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
//       }).addTo(map);

// form.addEventListener('submit', function (e) {
//   e.preventDefault();
//   //Clear input fieds
//   inputDistance.value =
//     inputDuration.value =
//     inputCadence.value =
//     inputElevation.value =
//       '';

//   //Display Marker
//   const { lat, lng } = mapEvent.latlng;
//   L.marker([lat, lng])
//     .addTo(map)
//     .bindPopup(
//       L.popup({
//         maxWidth: 300,
//         minWidth: 150,
//         autoClose: false,
//         closeOnClick: false,
//         className: 'running-popup',
//       })
//     )
//     .setPopupContent('Workout')
//     .openPopup();
// });

// inputType.addEventListener('change', function () {
//   inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
//   inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
// });
