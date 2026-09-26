// Venue photography, prepared by scripts/prepare-photos.mjs. Static imports
// give next/image the dimensions and a blur placeholder for free.
import type { StaticImageData } from "next/image";

import acheke from "@/assets/photos/acheke-jollof-platter.jpg";
import aperolSpritz from "@/assets/photos/aperol-spritz.jpg";
import birthdayBalloons from "@/assets/photos/birthday-balloons.jpg";
import blueCocktail from "@/assets/photos/blue-cocktail.jpg";
import breakfastPlate from "@/assets/photos/breakfast-plate.jpg";
import burgerAndFries from "@/assets/photos/burger-and-fries.jpg";
import cafeHall from "@/assets/photos/cafe-hall.jpg";
import cappuccino from "@/assets/photos/cappuccino.jpg";
import celebrationBlueYellow from "@/assets/photos/celebration-blue-yellow.jpg";
import celebrationLongTable from "@/assets/photos/celebration-long-table.jpg";
import celebrationTableSetting from "@/assets/photos/celebration-table-setting.jpg";
import chocolateCake from "@/assets/photos/chocolate-cake.jpg";
import conferenceRoom from "@/assets/photos/conference-room.jpg";
import conferenceUShape from "@/assets/photos/conference-u-shape.jpg";
import cosmopolitan from "@/assets/photos/cosmopolitan.jpg";
import dateNightTable from "@/assets/photos/date-night-table.jpg";
import diningEvening from "@/assets/photos/dining-evening.jpg";
import diningHall from "@/assets/photos/dining-hall.jpg";
import diningLounge from "@/assets/photos/dining-lounge.jpg";
import diningOakCeiling from "@/assets/photos/dining-oak-ceiling.jpg";
import diningRattanLamps from "@/assets/photos/dining-rattan-lamps.jpg";
import diningRoom from "@/assets/photos/dining-room.jpg";
import eggsBenedict from "@/assets/photos/eggs-benedict.jpg";
import eventGuests from "@/assets/photos/event-guests.jpg";
import eventHall from "@/assets/photos/event-hall.jpg";
import eventHallLogo from "@/assets/photos/event-hall-logo.jpg";
import eventHallTable from "@/assets/photos/event-hall-table.jpg";
import fineDiningPlate from "@/assets/photos/fine-dining-plate.jpg";
import flatbreadPizza from "@/assets/photos/flatbread-pizza.jpg";
import frappe from "@/assets/photos/frappe.jpg";
import friedChickenRice from "@/assets/photos/fried-chicken-rice.jpg";
import icedLatte from "@/assets/photos/iced-latte.jpg";
import irishCoffee from "@/assets/photos/irish-coffee.jpg";
import liveMusicBand from "@/assets/photos/live-music-band.jpg";
import liveMusicSax from "@/assets/photos/live-music-sax.jpg";
import lobsterPlatter from "@/assets/photos/lobster-platter.jpg";
import margarita from "@/assets/photos/margarita.jpg";
import milkshakes from "@/assets/photos/milkshakes.jpg";
import miniBurgers from "@/assets/photos/mini-burgers.jpg";
import pastaGarlicBread from "@/assets/photos/pasta-garlic-bread.jpg";
import pinaColada from "@/assets/photos/pina-colada.jpg";
import pizzaPeppers from "@/assets/photos/pizza-peppers.jpg";
import seafoodBowl from "@/assets/photos/seafood-bowl.jpg";
import seafoodJollof from "@/assets/photos/seafood-jollof.jpg";
import smokingCocktail from "@/assets/photos/smoking-cocktail.jpg";
import springRolls from "@/assets/photos/spring-rolls.jpg";
import steakPlate from "@/assets/photos/steak-plate.jpg";
import terraceOpenAir from "@/assets/photos/terrace-open-air.jpg";
import terraceSeaTable from "@/assets/photos/terrace-sea-table.jpg";
import terraceSeaView from "@/assets/photos/terrace-sea-view.jpg";
import waffleSandwich from "@/assets/photos/waffle-sandwich.jpg";

export interface Photo {
  src: StaticImageData;
  alt: string;
}

const photo = (src: StaticImageData, alt: string): Photo => ({ src, alt });

export const photos = {
  // Spaces
  diningOakCeiling: photo(diningOakCeiling, "Main dining room with honey-oak slatted ceiling opening onto the sea-view terrace"),
  diningRoom: photo(diningRoom, "Dining room with oak ceiling, black beams and dark wicker chairs"),
  diningLounge: photo(diningLounge, "Lounge seating by floor-to-ceiling windows under the oak ceiling"),
  diningHall: photo(diningHall, "Long dining hall with banquette seating and screens for match nights"),
  diningRattanLamps: photo(diningRattanLamps, "Dining area lit by woven rattan pendant lamps"),
  diningEvening: photo(diningEvening, "The restaurant in the evening under warm rattan lamps"),
  cafeHall: photo(cafeHall, "Bright café hall with the El Greco logo on the wall"),
  terraceSeaTable: photo(terraceSeaTable, "Terrace table overlooking the Atlantic"),
  terraceSeaView: photo(terraceSeaView, "Guest relaxing on the sea-view balcony"),
  terraceOpenAir: photo(terraceOpenAir, "Open-air terrace facing the ocean"),
  conferenceUShape: photo(conferenceUShape, "Conference room set up in a U-shape with sea-view windows"),
  conferenceRoom: photo(conferenceRoom, "Conference room with projector screen and boardroom tables"),
  eventHall: photo(eventHall, "Event hall with white-linen tables and black pendant lamps"),
  eventHallLogo: photo(eventHallLogo, "Event hall dressed in white linen with the El Greco logo wall"),
  eventHallTable: photo(eventHallTable, "White-linen table with a floral centrepiece in the event hall"),
  // Occasions
  celebrationLongTable: photo(celebrationLongTable, "Long celebration table dressed in yellow and blue beside the sea"),
  celebrationBlueYellow: photo(celebrationBlueYellow, "Celebration table styled with Greek blue-and-yellow tiles and flowers"),
  celebrationTableSetting: photo(celebrationTableSetting, "Private dinner table set for a large party"),
  birthdayBalloons: photo(birthdayBalloons, "Birthday set-up with a blue and yellow balloon arch"),
  eventGuests: photo(eventGuests, "Guests at an evening event with a buffet"),
  dateNightTable: photo(dateNightTable, "Dinner at a table set with flowers and white linen"),
  fineDiningPlate: photo(fineDiningPlate, "Plated dish served on white linen"),
  liveMusicSax: photo(liveMusicSax, "Saxophonist performing live at El Greco"),
  liveMusicBand: photo(liveMusicBand, "Live band with saxophone and guitar in front of the lit feature wall"),
  // Food
  acheke: photo(acheke, "Acheke and jollof platter with fish, chicken, plantain and fruit"),
  eggsBenedict: photo(eggsBenedict, "Eggs benedict with hollandaise sauce"),
  seafoodJollof: photo(seafoodJollof, "Seafood jollof with octopus and lime"),
  seafoodBowl: photo(seafoodBowl, "Seafood bowl served on black stoneware"),
  burgerAndFries: photo(burgerAndFries, "Burger with fries, chicken strips and dips"),
  springRolls: photo(springRolls, "Crispy vegetable spring rolls"),
  steakPlate: photo(steakPlate, "Grilled steak with salad, fries and sauce"),
  chocolateCake: photo(chocolateCake, "Slice of layered chocolate cake"),
  miniBurgers: photo(miniBurgers, "Three mini burgers on a slate"),
  lobsterPlatter: photo(lobsterPlatter, "Grilled lobster platter with fries and vegetables"),
  flatbreadPizza: photo(flatbreadPizza, "Flatbread pizza with tomato, mozzarella and rocket"),
  breakfastPlate: photo(breakfastPlate, "Breakfast plate with scrambled eggs, toast, cold cuts and fruit"),
  pastaGarlicBread: photo(pastaGarlicBread, "Pasta with garlic bread"),
  friedChickenRice: photo(friedChickenRice, "Crispy fried chicken with fried rice and chilli sauce"),
  pizzaPeppers: photo(pizzaPeppers, "Pizza with peppers and onions on a wooden board"),
  waffleSandwich: photo(waffleSandwich, "Waffle sandwich with salad"),
  // Drinks
  margarita: photo(margarita, "Classic margarita with a salted rim and lime"),
  icedLatte: photo(icedLatte, "Iced latte"),
  cappuccino: photo(cappuccino, "Cappuccino with latte art"),
  frappe: photo(frappe, "Frappé with chocolate drizzle"),
  smokingCocktail: photo(smokingCocktail, "Smoking red cocktail in a martini glass"),
  blueCocktail: photo(blueCocktail, "Blue tropical cocktail with a paper umbrella"),
  cosmopolitan: photo(cosmopolitan, "Cosmopolitan on the bar"),
  pinaColada: photo(pinaColada, "Three piña coladas with pineapple"),
  milkshakes: photo(milkshakes, "Three milkshakes topped with cream"),
  aperolSpritz: photo(aperolSpritz, "Aperol spritz in front of the cocktail guide"),
  irishCoffee: photo(irishCoffee, "Coffee topped with whipped cream"),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof photos;
