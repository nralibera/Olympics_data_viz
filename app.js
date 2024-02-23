import { drawPathFromAnAthleteList } from './functions.js';
import { drawJourneyFromMedalsData } from './functions.js';
import { displayBio } from './functions.js';
import { updateSelectedAthletes } from './functions.js';
import { buildAthleteListFromACountry } from './functions.js';
import { buildCountryMedalFromAthleteList } from './functions.js';
import { getCountryCodeFromCountryMapName } from './functions.js';
import { closestYear } from './functions.js';
import { buildMedalListingInYearFromAthleteList } from './functions.js';

// import variables from './functions.js';
import { graph, g, pathGenerator } from './functions.js';

// Show the loading screen
document.getElementById('loading').style.display = 'block';

// Default athletes to plot
const id_to_plot = ["103315","11524","127932","47512","133746"];

Promise.all([
  d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'),
  d3.json('./Olympics Data From 1986 to 2022/athlete_data_medals.json'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympic_Athlete_Bio.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympic_Games_Medal_Tally.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympics_Games.csv'),
  d3.csv('./Olympics Data From 1986 to 2022/Olympics_Country.csv')
]).then(([data, athleteData, athleteBioData, medalCountryData, gamesData, olympicsCountryData]) => {
  
      // Hide the readme popup and loading screen
      d3.select('.readmePopupOpen').attr("class", "readmePopup");
      d3.select('#loading').style('display', 'none');

      // Extract all the years from the games data
      const allOlympicsYear = gamesData.map(d => d['year']);

      // Set the initial year
      let year = 2016;

      // Extract the countries from the topojson data
      const countries = topojson.feature(data, data.objects.countries);

      // Select the bio div and remove all its child divs and h2 elements
      const bioDiv = d3.select(".bio");
      bioDiv.selectAll("div, h2").remove();

      // Remove all bars and axes from the graph
      graph.selectAll(".bar").remove();
      graph.selectAll(".axis").remove();

      // Bind the countries data to the path elements in the SVG
      const countriesPath = g.selectAll('path')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('class', 'country')
          .attr('d', pathGenerator)
          .attr('fill', 'url(#greyDots)')  // Fill the countries with a grey dot pattern

      // Change the fill of the country on mouseover to a red dot pattern
      countriesPath.on("mouseover", function(event, d) {
          d3.select(this).attr('fill', 'url(#redDots)');
      });

      // Change the fill of the country back to the grey dot pattern on mouseout
      countriesPath.on("mouseout",  function(event, d) {
          d3.select(this).attr('fill', 'url(#greyDots)');
      });

      // On click, display the bio and draw the journey of the athletes from the clicked country
      countriesPath.on("click", function(event, d) {
          let year = closestYear(yearInput.property("value"),allOlympicsYear);
          const countryName = event.properties.name;
          const countryCode = getCountryCodeFromCountryMapName(countryName,olympicsCountryData);
          const athleteList = buildAthleteListFromACountry(countryCode, athleteData, year);
          const medalListing = buildMedalListingInYearFromAthleteList(athleteList, athleteData, year);
          const countryNoc = getCountryCodeFromCountryMapName(countryName,olympicsCountryData,true);
          const countryMedals = buildCountryMedalFromAthleteList(countryNoc, athleteList, athleteData, medalCountryData, gamesData);
          

          drawPathFromAnAthleteList(athleteList, athleteData, athleteBioData, gamesData);
          drawJourneyFromMedalsData(countryMedals);
          displayBio(countryName ,true ,medalListing ,gamesData);
      });

      // Create a group to host all the paths
      g.append('g').attr('class', 'allPathsGroup');

      // Create a list of all athletes
      const allAthleteList = Object.keys(athleteData).map(function(d) {return {'id': d, 'name': athleteData[d]['athlete_name']}});
      const optionDiv = d3.select(".optionChoice");
      const listOfAthletesToDisplay = [];
      const selectedAthletesDiv = d3.select(".athleteSelection");
      selectedAthletesDiv.append("div").attr("class", "selectedAthletes");

      // Create a search input for athletes
      let searchInput = optionDiv.append("input")
      .attr("type", "text")
      .attr("placeholder", "Search for athletes...")
      .on("input", updateSuggestions);

      let suggestionBox = optionDiv.append("div").attr("class", "suggestions");

        // Create year input
        let yearInput = selectedAthletesDiv.append("input")
        .attr("type", "number")
        .attr("value", year)
        .attr("class", "yearInput")
        .attr("placeholder", "Enter year")
        .attr("min", "1896") // The first modern Olympics were held in 1896
        .attr("max", "2022")

        //Create a button to show read me
        let readMeButton = selectedAthletesDiv.append("button")
                          .attr("class", "readMeButton")
                          .text("Read Me")
                          .on("click", function() {
                            let readmeDiv = d3.select(".readmePopup")
                            .attr("class", "readmePopupOpen");
                            
                            d3.select(".readmePopupOpen button").remove();
                            d3.select(".readmePopupOpen").append("button")
                            .text("Close Read Me")
                            .on("click", function() {
                              readmeDiv.attr("class", "readmePopup") // Hide the popup when the button is clicked
                            });
                          });


        //make a button to update the graph
        let updateButton = optionDiv.append("button")
        .attr("class", "updateButton")
        .text("Update Map")
        .on("click", function() {
            drawPathFromAnAthleteList(listOfAthletesToDisplay, athleteData, athleteBioData, gamesData);
        })

        // Create a button to clear the selected athletes
        let clearButton = optionDiv.append("button")
        .attr("class", "clearButton")
        .text("Clear List")
        .on("click", function() {
        listOfAthletesToDisplay.length = 0;
        updateSelectedAthletes(listOfAthletesToDisplay,athleteData);
        });

        

function updateSuggestions() {
  let filter = this.value.toUpperCase().trim();
  if (filter === "") {
    suggestionBox.selectAll("div").remove();
    return;
  }
  let matchedAthletes = allAthleteList.filter(function(d) {
    let txtValue = d.name.toUpperCase();
    return txtValue.indexOf(filter) > -1;
  });

  // Shuffle the matched athletes
  matchedAthletes = matchedAthletes.sort(() => Math.random() - 0.5);
  // Limit the number of suggestions to 10
  matchedAthletes = matchedAthletes.slice(0, 10);

  let suggestions = suggestionBox.selectAll("div")
    .data(matchedAthletes, function(d) { return d.id; });

  suggestions.exit().remove();

  suggestions.enter().append("div")
    .merge(suggestions)
    .text(function(d) { return d.name; })
    .on("click", function(d) {
      // Handle selection
      searchInput.property("value", "");
      suggestionBox.selectAll("div").remove();
      if (!listOfAthletesToDisplay.includes(d.id)) {
        listOfAthletesToDisplay.push(d.id);
      }
      updateSelectedAthletes(listOfAthletesToDisplay,athleteData);
    });
}
    
    drawPathFromAnAthleteList(id_to_plot, athleteData, athleteBioData, gamesData);
});


