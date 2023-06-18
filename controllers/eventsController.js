const express = require("express");

const comm = require("./commentController")

const events = express.Router();

const { getAllEvents, 
    getEvent, 
    createEvent, 
    deleteEvent, 
    addCategory,
    deleteCategoryFromEvent,
    updateEvent,
    createCohost,
    getCoHost,
    allUserCoHost,
    deleteCoHost } = require("../queries/Events");


events.use("/:eventId/comments", comm)



//! GET ALL EVENTS
events.get("/", async (req, res) => {
  const allEvents = await getAllEvents();
  const filters = req.query;

  const filterEvents = allEvents.filter((event) => {
    let isValid = true;

    for (key in filters) {
      if (key === "creator.id") {
        const creatorIdFilter = parseInt(filters[key]);
        const matchingCreator = event.creator.find(
          (creator) => creator.id === creatorIdFilter
        );

        isValid = isValid && (matchingCreator !== undefined);
      } else if (key === "category_names.name") {
        const categoryNamesFilter = filters[key].toLowerCase();
        const matchingCategory = event.category_names.find(
          (category) => category.name.toLowerCase() === categoryNamesFilter
        );

        isValid = isValid && (matchingCategory !== undefined);
      } else if (isNaN(filters[key])) {
        isValid = isValid && (event[key].toLowerCase() === filters[key].toLowerCase());
      } else {
        isValid = isValid && (event[key] == parseInt(filters[key]));
      }
    }

    return isValid;
  });

  res.send(filterEvents);
});




//! GET ONE EVENT
events.get("/:id", async (req, res) => {
    const { id } = req.params;
    const event = await getEvent(id);
    if (!event.message) {
        res.json(event);
    } else {
        res.status(500).json({ error: "Event not found!"});
    }
});


//! CREATE A NEW EVENT
events.post("/", async (req, res) => {
    try {
    const { categoryIds, ...event } = req.body; // Extract categoryIds from req.body
    const createdEvent = await createEvent(event, categoryIds); // Pass categoryIds to createEvent function
    console.log(createdEvent)
    res.json(createdEvent);
    } catch (error) {
        res.status(400).json({ error: error });
    }
});


//! DELETE AN EVENT
events.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const event = await deleteEvent(id);
    if (event.id) {
        res.status(200).json(event);
    } else {
        res.status(404).json({ error: "Event not found!"});
    }
});


//Delete Category From Event
events.delete("/:eventId/categories/:categoryId", async (req, res) => {
    const { eventId, categoryId } = req.params;
  
    const deleteCategory = await deleteCategoryFromEvent(eventId, categoryId);
    if (deleteCategory > 0) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ error: "Event category not found!" });
    }
  });


//Add Category to Event

events.post("/:eventId/categories", async (req, res) => {
    const { eventId} = req.params;
    const { categoryIds } = req.body;
    try {
        const event = await addCategory(eventId, categoryIds);
        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ error: "Server error!" });
    }
});



//! UPDATE AN EVENT

events.put("/:id", async (req , res) => {
    const { id } = req.params;

    const updatedEvent = await updateEvent(id, req.body);

    res.status(200).json(updatedEvent);
})

//Add a co-host to an event
events.post(`/:userId/cohost/:eventId`, async (req, res) => {
    try {
      const { userId, eventId } = req.params;
      const host = await createCohost(userId, eventId);
      res.status(200).json(host);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "User not found" });
    }
  });
  
  //Getting all the events co-host
  events.get(`/:eventId/hosts`, async (req, res) => {
    try {
      const { eventId } = req.params;
      const hosts = await getCoHost(eventId);
  
      if (hosts.length > 0) {
        res.json(hosts);
      } else {
        res.status(404).json({ error: "No cohosts found for the event" });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "User not found" });
    }
  });
  
//Getting all the events the user is co-hosting
events.get(`/:id/cohosting`, async (req, res) => {
  try {
    const { id } = req.params;
    const cohostedEvents = await allUserCoHost(id);
    res.json(cohostedEvents);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "An error occurred while retrieving cohosted events" });
  }
});


//Delete co-host from an event 
events.delete(`/:userId/deletehost/:eventId`, async (req , res) => {

const {userId , eventId} = req.params

const host = await deleteCoHost(userId , eventId)

if(host.length > 0){
  res.status(200).json(host);
}
else {
        res.status(404).json({ error: "Host not found!"});
    }
})

module.exports = events;