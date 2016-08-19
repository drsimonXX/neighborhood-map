  var map;

    // blank array for all the listing markers
    var markers = [];

    // placemarkers array to control the number of places that show.
    var placeMarkers = [];

    function initMap() {
      // create map with zoom and center
      map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 41.7193929, lng: -87.6963421},
        zoom: 13
      });

      // autocompletes for search boxes
      var timeAutocomplete =  new google.maps.places.Autocomplete(
        document.getElementById('search-within-time-text'));
      
      var searchBox = new google.maps.places.SearchBox(
        document.getElementById('places-search'));

      // bias the search box to within the bounds of the map
      searchBox.setBounds(map.getBounds());

      // array of locations, place names for list and search name for wiki api
      var locations = [
        {title: 'Noodles & Co.', search: 'Noodles and Company', location: {lat: 41.7212064, lng: -87.6831114}},
        {title: 'Wingstop', search: 'Wingstop', location: {lat: 41.7204176, lng: -87.6933674}},
        {title: 'Roseangela\'s Pizzeria', search: 'Roseangela\'s Pizzeria', location: {lat: 41.7208285, lng: -87.6924281}},
        {title: 'Portillo\'s Hot Dogs', search: 'Portillo\'s Restaurants', location: {lat: 41.7207885, lng: -87.72315709999999}},
        {title: 'Giordano\'s Pizzeria', search: 'Giordano\'s Pizzeria', location: {lat: 41.7186667, lng: -87.68151499999999}},
        {title: 'Potbelly Sandwich Shop', search: 'Potbelly Sandwich Works', location: {lat: 41.7195359, lng: -87.7492457}},
        {title: 'Entenmann\'s Bakery Outlet', search: 'Entenmann\'s', location: {lat: 41.69624220000001, lng: -87.7404669}}
        ];

      var largeInfowindow = new google.maps.InfoWindow();
      var bounds = new google.maps.LatLngBounds();
      var defaultIcon = makeMarkerIcon('FF0000');
      var highlightedIcon = makeMarkerIcon('FFFF24');

      var model = function() {
        var self = this;
        self.placesList = ko.observableArray(locations);

        self.placesList().forEach(function(location, place) {
          location.marker = markers[place];
        });

       /* 
        attempting to create function to filter lists--need suggestions, please
       self.filteredPlaces = function() {
          if (!location.marker) {
            self.placesList.removeAll(location.marker);
          };
        };*/

        self.marker = ko.observableArray(markers);

        self.clickMarker = function(location) {
          populateInfoWindow(location.marker, largeInfowindow);
          location.marker.setAnimation(google.maps.Animation.BOUNCE);
          stopAnimation(location.marker);
        };
      };

      window.onload = function() {
        ko.applyBindings(new model());
      };

      // use the location array to create an array of markers on initialize
      for (var i = 0; i < locations.length; i++) {
        var position = locations[i].location;
        var title = locations[i].title;
        var search = locations[i].search;

        // create a marker for each location, put into markers array
        var marker = new google.maps.Marker({
          map: map,
          position: position,
          title: title,
          search: search,
          animation: google.maps.Animation.DROP,
          icon: defaultIcon,
          id: i
        });

        // push the marker to the array of markers
        markers.push(marker);
        //extend the boundaries of the map for each marker
        bounds.extend(marker.position);

        // create a click or mouse event for each marker
        marker.addListener('click', function() {
          populateInfoWindow(this, largeInfowindow);
        });
        marker.addListener('mouseover', function() {
          this.setIcon(highlightedIcon);
        });
        marker.addListener('mouseout', function() {
          this.setIcon(defaultIcon);
        });
        marker.addListener('click', function() {
          this.setAnimation(google.maps.Animation.BOUNCE);
          stopAnimation(this);
        });
      }

      document.getElementById('show-listings').addEventListener('click', showListings);
      document.getElementById('hide-listings').addEventListener('click', hideListings);
      document.getElementById('search-within-time').addEventListener('click', function() {
        searchWithinTime();
      });

      // event listeners for search box
      searchBox.addListener('places_changed', function() {
        searchBoxPlaces(this);
      });
      
      document.getElementById('go-places').addEventListener('click', textSearchPlaces);
    }

      // populate the info window if it's not already open
      function populateInfoWindow(marker, infowindow) {
        if (infowindow.marker != marker) {
          infowindow.setContent('');
          infowindow.marker = marker;
          // make sure the marker property is cleared if the infowindow is closed
          infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
          });
          var streetViewService = new google.maps.StreetViewService();
          var radius = 50;

          // get street view if status is ok, fill infowindow with info
          function getStreetView(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
              var nearStreetViewLocation = data.location.latLng;
              var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
                infowindow.setContent('<div>' + marker.title + '</div><div id="pano"></div>' + '<div id="Wiki"></div>');

              // add wiki api search functionality for each place
              var wikiURL ='https://en.wikipedia.org/w/api.php?action=opensearch&format=json&callback=wikiCallBack&search=';

              $.ajax({
                url: wikiURL+marker.search,
                dataType: 'jsonp',
                timeout: 1000
              }).done(function(data) {
                document.getElementById('Wiki').innerHTML = '<p>' + '<a href=' + data[3][0] + ' target="blank">Wikipedia</a></p>';
                }).fail(function(jqXHR, textStatus){
                alert("The Wikipedia link search failed.");
              });
                
              // get streetview info to add to pano
              var panoramaOptions = {
                  position: nearStreetViewLocation,
                  pov : {
                    heading: heading,
                    pitch: 30
                  }
                };
              var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
            } else {
              infowindow.setContent('<div>' + marker.title + '</div>' + '<div>No Street View Found</div>');
            }
          }
          // use streetview service to get the closest streetview image within 50 meters of the marker's position
          streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
          // open the infowindow on the correct marker
          infowindow.open(map, marker);
        }
      };

      // display all markers when button is clicked
      function showListings() {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(map);
          bounds.extend(markers[i].position);
        }
        map.fitBounds(bounds);
      };

      // hide all markers when button is clicked
      function hideListings() {
        for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(null);
        }
      };

      // hide all markers
      function hideMarkers(markers) {
        for (var i = 0; i < markers.length; i++) {
          markers[i].setMap(null);
        }
      };
      
      function makeMarkerIcon(markerColor) {
        var markerImage = new google.maps.MarkerImage(
          'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
            '|40|_|%E2%80%A2',
            new google.maps.Size(21, 34),
            new google.maps.Point(0, 0),
            new google.maps.Point(10, 34),
            new google.maps.Size(21,34));
          return markerImage;
      };

      // find the nearest location to a searched-for location
      function searchWithinTime() {
        // initialize the distance matrix service
        var distanceMatrixService = new google.maps.DistanceMatrixService;
        var address = document.getElementById('search-within-time-text').value;

        if (address == '') {
          window.alert('You must enter an address.');
        } else {
          hideListings();
          // use the distance matrix service to calc the duration of the routes between the marker and the searched location
          var origins = [];
          for (var i = 0; i < markers.length; i++) {
            origins[i] = markers[i].position;
          };
          var destination = address;
          var mode = document.getElementById('mode').value;
          // get distance info
          distanceMatrixService.getDistanceMatrix({
            origins: origins,
            destinations: [destination],
            travelMode: google.maps.TravelMode[mode],
            unitSystem: google.maps.UnitSystem.IMPERIAL,
          }, function(response, status) {
            if (status !== google.maps.DistanceMatrixStatus.OK) {
              window.alert('Error was: ' + status);
            } else {
              displayMarkersWithinTime(response);
            }
          });
        }
      };

      // show the places within the selected time frame and how long travel time takes
      function displayMarkersWithinTime(response) {
        var maxDuration = document.getElementById('max-duration').value;
        var origins = response.originAddresses;
        var destinations = response.destinationAddresses;
        
        var atLeastOne = false;
        for (var i = 0; i < origins.length; i++) {
          var results = response.rows[i].elements;
          for (var j = 0; j < results.length; j++) {
            var element = results[j];
            if (element.status === "OK") {
              var distanceText = element.distance.text;

              // convert travel time to mins
              var duration = element.duration.value / 60;
              var durationText = element.duration.text;
              if (duration <= maxDuration) {
                markers[i].setMap(map);
                atLeastOne = true;
                // create an infowindow to show the distance and duration
                var infowindow = new google.maps.InfoWindow({
                  content: durationText + ' away, ' + distanceText + '<div><input type=\"button\" value=\"View Route\" onclick =' + '\"displayDirections(&quot;' + origins[i] + '&quot;);\"></input></div>'
                });
                infowindow.open(map, markers[i]);
                // close the distance infowindow when the main infowindow opens
                markers[i].infowindow = infowindow;
                google.maps.event.addListener(markers[i], 'click', function() {
                  this.infowindow.close();
                });
              }
            }
          }
        }
        if (!atLeastOne) {
          window.alert('No locations within that distance were located.');
        }
      };

      // clicking "view route" will display the route based on selected mode and searched location
      function displayDirections(origin) {
        hideListings();
        var directionsService = new google.maps.DirectionsService;
        var destinationAddress = document.getElementById('search-within-time-text').value;
        var mode = document.getElementById('mode').value;
        directionsService.route({
          origin: origin,
          destination: destinationAddress,
          travelMode: google.maps.TravelMode[mode]
        }, function(response, status) {
          if (status === google.maps.DirectionsStatus.OK) {
            var directionsDisplay = new google.maps.DirectionsRenderer({
              map: map,
              directions: response,
              draggable: true
            });
          } else {
            window.alert('Directions request failed due to ' + status);
          }
        });
      };

      // search for a nearby place 
      function textSearchPlaces() {
        var bounds = map.getBounds();
        hideMarkers(placeMarkers);
        var placesSearch = document.getElementById('places-search').value;
        if (placesSearch == '') {
          window.alert('You must enter a search.');
        };
        var placesService = new google.maps.places.PlacesService(map);
        placesService.textSearch({
          query: document.getElementById('places-search').value,
          bounds: bounds
        }, function(results, status) {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            createMarkersForPlaces(results);
          } 
        });
      };

      // create marker for each place location in the search
      function createMarkersForPlaces(places) {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < places.length; i++) {
          var place = places[i];
          var icon = {
            url: place.icon,
            size: new google.maps.Size(35, 35),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(15, 34),
            scaledSize: new google.maps.Size(25, 25)
          };
          
          var marker = new google.maps.Marker({
              map: map,
              icon: icon,
              title: place.name,
              position: place.geometry.location,
              id: place.place_id
            });

            // open one infowindow
            var placeInfoWindow = new google.maps.InfoWindow();

            // conduct a place details search on the clicked marker
            marker.addListener('click', function() {
              if (placeInfoWindow.marker == this) {
                console.log("This infowindow already is on this marker!");
              } else {
                getPlacesDetails(this, placeInfoWindow);
              }
            });
            placeMarkers.push(marker);
            if (place.geometry.viewport) {
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
          }
          map.fitBounds(bounds);
        };

      // search without pressing go by selecting from autocomplete results
      function searchBoxPlaces(searchBox) {
        hideMarkers(placeMarkers);
        var places = searchBox.getPlaces();
        if (places.length == 0) {
          window.alert('No places found matching your search!');
        } else {
          // for each place, get the icon, name and location.
          createMarkersForPlaces(places);
        }
      };

      // place details search, get name, address, #, opening hours for infowindow
      function getPlacesDetails(marker, infowindow) {

        var service = new google.maps.places.PlacesService(map);
        service.getDetails({
          placeId: marker.id
        }, function(place, status) {
          if (status === google.maps.places.PlacesServiceStatus.OK) {
            // set marker to this infowindow.
            infowindow.marker = marker;
            var innerHTML = '<div>';
            if (place.name) {
              innerHTML += '<strong>' + place.name + '</strong>';
            }
            if (place.formatted_address) {
              innerHTML += '<br>' + place.formatted_address;
            }
            if (place.formatted_phone_number) {
              innerHTML += '<br>' + place.formatted_phone_number;
            }
            if (place.opening_hours) {
              innerHTML += '<br><br><strong>Hours:</strong><br>' +
                  place.opening_hours.weekday_text[0] + '<br>' +
                  place.opening_hours.weekday_text[1] + '<br>' +
                  place.opening_hours.weekday_text[2] + '<br>' +
                  place.opening_hours.weekday_text[3] + '<br>' +
                  place.opening_hours.weekday_text[4] + '<br>' +
                  place.opening_hours.weekday_text[5] + '<br>' +
                  place.opening_hours.weekday_text[6];
            }
            if (place.photos) {
              innerHTML += '<br><br><img src="' + place.photos[0].getUrl(
                  {maxHeight: 100, maxWidth: 200}) + '">';
            }
            innerHTML += '</div>';
            infowindow.setContent(innerHTML);
            infowindow.open(map, marker);
           
            infowindow.addListener('closeclick', function() {
              infowindow.marker = null;
            });
          }
        });
      };

      // stop the marker from bouncing after 3 bounces
      function stopAnimation(marker) {
        setTimeout(function() {
            marker.setAnimation(null);
          }, 2100);
      };

