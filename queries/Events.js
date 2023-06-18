const db = require("../db/dbConfig")

const getAllEvents = async () => {
  try {
    const allEvents = await db.manyOrNone(`
      SELECT events.*, 
      array_agg(json_build_object('id', categories.id, 'name', categories.name)) AS category_names,
    array_agg(json_build_object('id', users.id, 'username', 
      users.username, 'first_name', first_name, 'last_name', last_name, 'profile_img', users.profile_img,'age', EXTRACT(YEAR FROM AGE(CURRENT_DATE, age)) )) AS creator,
      to_char(start_time, 'HH:MI AM') AS start_time, 
      to_char(end_time, 'HH:MI AM') AS end_time,
      to_char(date_created, 'YYYY-MM-DD') AS date_created, 
      to_char(date_event, 'YYYY-MM-DD') AS date_event
      FROM events
      JOIN events_categories ON events.id = events_categories.event_id
      JOIN categories ON categories.id = events_categories.category_id
      JOIN users ON users.id = events.creator
      GROUP BY events.id
      HAVING count(*) > 1 OR count(events_categories.event_id) = 1;
    `);
    return allEvents;
  } catch (error) {
    console.log(error)
    return error;
  }
};



const getEvent = async (id) => {
  try {
    const oneEvent = await db.one(
      `
      SELECT events.*, 
      array_agg(json_build_object('id', categories.id, 'name', categories.name)) AS category_names,
      array_agg(json_build_object('id', users.id, 'username', 
      users.username, 'first_name', first_name, 'last_name', last_name, 'profile_img', users.profile_img,'age', EXTRACT(YEAR FROM AGE(CURRENT_DATE, age)) )) AS creator,
      to_char(start_time, 'HH:MI AM') AS start_time, 
      to_char(end_time, 'HH:MI AM') AS end_time,
      to_char(date_created, 'YYYY-MM-DD') AS date_created, 
      to_char(date_event, 'YYYY-MM-DD') AS date_event
      FROM events
      JOIN events_categories ON events.id = events_categories.event_id
      JOIN categories ON categories.id = events_categories.category_id
      JOIN users ON users.id = events.creator
      WHERE events.id = $1
      GROUP BY events.id HAVING count(*) > 1 OR count(events_categories.event_id) = 1;
      `,
      id
    );
    return oneEvent;
  } catch (error) {
    console.log(error)
    return error;
  }
};


const createEvent = async (event, categoryNames, creatorUsernames) => {
  try {
    // Retrieve category IDs based on names
    const categoryIds = await db.manyOrNone(
      `SELECT id FROM categories WHERE name = ANY($1)`,
      [categoryNames]
    );

    // Retrieve creator IDs based on usernames
    const creatorIds = await db.manyOrNone(
      `SELECT DISTINCT id FROM users WHERE username = ANY($1)`,
      [creatorUsernames]
    );

    if (categoryIds.length < 1) {
      return { error: 'Event must have at least one category.' };
    } else {
      const newEvent = await db.one(
        `INSERT INTO events (title, date_event, summary,
           max_people, age_restriction, age_min, age_max, location, address, latitude, longitude, start_time, end_time, location_image, creator)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING *`,
        [
          event.title,
          event.date_event,
          event.summary,
          event.max_people,
          event.age_restriction,
          event.age_min,
          event.age_max,
          event.location,
          event.address,
          event.latitude,
          event.longitude,
          event.start_time,
          event.end_time,
          event.location_image,
          event.creator, // Assuming there is only one creator
        ]
      );

      // Insert event-category relationships into events_categories table
      const eventCategoryValues = categoryIds
        .map((categoryId) => `(${newEvent.id}, ${categoryId.id})`)
        .join(',');
      await db.none(
        `INSERT INTO events_categories (event_id, category_id) VALUES ${eventCategoryValues}`
      );

      // Add category_names and creator arrays to the new event object
      newEvent.category_names = categoryNames.map((name, index) => ({
        id: categoryIds[index].id,
        name: name,
      }));

      newEvent.creator = creatorIds.map((creator) => ({
        id: creator.id,
        username: creator.username,
        first_name: creator.first_name,
        last_name: creator.last_name,
        profile_img: creator.profile_img,
        age: creator.age,
      }));

      return newEvent;
    }
    // Insert new event into events table
  } catch (error) {
    console.log(error);
    return error;
  }
};





const deleteCategoryFromEvent = async (eventId, categoryId) => {
  try{
    const deleteCategory = await db.result(
      'DELETE FROM events_categories WHERE event_id = $1 AND category_id=$2 RETURNING *',
      [eventId, categoryId]
    )
    return deleteCategory.rowCount
  }
  catch(error){
    return error
  }
}


const addCategory = async(eventId , categoryIds) => {
  try{
     await db.none(
      'INSERT INTO events_categories (event_id, category_id) SELECT $1, unnest($2::int[])',
      [eventId , categoryIds]
    )

    const updateEvent = await getEvent(eventId)
    return updateEvent
  }
  catch(error){
    console.log(error)
    return error
  }
}



const deleteEvent = async (id) => {
    try{
        const deletedEvents = await db.one(
            'DELETE FROM events WHERE id = $1 RETURNING *', id
        )
        return deletedEvents
    }
    catch(error){
        return error
    }
}



const updateEvent = async(id , event) => {

  try{
  
  const updatedEvent = await db.one(
    `
    UPDATE events SET title=$1, date_event=$2, summary=$3, max_people=$4, age_restriction=$5, 
    age_min=$6, age_max=$7, location=$8, 
    address=$9, start_time=$10, end_time=$11, location_image=$12 WHERE id=$13 RETURNING *`,

    [event.title , event.date_event, event.summary, event.max_people, event.age_restriction
    ,event.age_min, event.age_max, event.location, 
    event.address, event.start_time, event.end_time, event.location_image, id ]
  );
  return updatedEvent
  }
  catch(error){
    console.log(error)
    return error
  }
  
  }

  const createCohost = async (userId , eventId) => {
    try{
      const add = await db.none(
        `INSERT INTO events_cohost (user_id , event_id) VALUES($1 , $2)`,
        [userId , eventId]
      )
      return add
    }
    catch(error){
      console.log(error)
      return error
    }
  }

const getCoHost = async (id) => {
try{
  const getCoHost = await db.any(
    `SELECT ec.user_id, ec.event_id, 
    u.profile_img, u.first_name, u.last_name, u.username
    FROM events_cohost ec
    JOIN users u ON u.id = ec.user_id
    JOIN events e ON e.id = ec.event_id
    WHERE e.id = $1`,
    id
  );
  return getCoHost
}
catch(error){
  console.log(error)
  return error
}
}


const allUserCoHost = async (id) => {
  try {
    const host = await db.any(
      `SELECT e.title, e.location_image, u.id AS user_id, e.id AS event_id
      FROM users u
      JOIN events_cohost ec ON u.id = ec.user_id
      JOIN events e ON e.id = ec.event_id
      WHERE u.id = $1`,
      id
    );
    return host;
  } catch (error) {
    console.log(error);
    return error;
  }
};


const deleteCoHost = async (userId , eventId) => {
  try{
    const deleteHost = await db.any(
      `DELETE FROM events_cohost WHERE user_id=$1 AND event_id=$2`,
      [userId , eventId]
    );
    return deleteHost
  }
  catch(error){
    console.log(error)
    return error 
  }
}


module.exports = {deleteEvent , createEvent, getAllEvents, 
  getEvent, addCategory, 
  deleteCategoryFromEvent, updateEvent, createCohost, getCoHost, allUserCoHost, deleteCoHost}
