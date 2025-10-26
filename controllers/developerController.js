const pool = require('../config/db');

exports.getDevelopersSuggestions = async (req, res) => {
  let connection;
  try {
    const { query } = req.query;

    connection = await pool.getConnection();

    if (!query || query.trim() === "") {
      return res.status(200).json([]);
    }

    const searchTerm = `%${query}%`;

    const [rows] = await connection.query(
      `SELECT id, name 
       FROM users 
       WHERE role = 'developer' 
         AND LOWER(name) LIKE LOWER(?) 
       ORDER BY name ASC 
       LIMIT 10`,  // return max 10 suggestions for performance
      [searchTerm]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error fetching developer suggestions:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release();
  }
};
