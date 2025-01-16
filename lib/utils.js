import { format, isToday, isYesterday, isThisWeek } from 'date-fns'



export const generateRoomId = (userId1, userId2) => {
    return [userId1, userId2].sort().join('-'); // Ensure consistent order with a delimiter
};

export  const formatMessageDate = (lastUpdated) => {
    if (!lastUpdated) {
      return ''; // Handle undefined or empty date strings
    }
 
    if (lastUpdated.length === 24) {
      // Remove characters from position 17 to 19
       lastUpdated = lastUpdated.slice(0, 17) + lastUpdated.slice(19);
    }
    else{
      lastUpdated=lastUpdated.slice(0, 16) + lastUpdated.slice(19);
    }
  
    // Log input for debugging
    console.log("Input Date:", lastUpdated);
  
    try {
      // Clean the string: remove commas and normalize spaces
      const cleanDateString = lastUpdated.replace(/,/g, '').replace(/\u202F|\s+/g, ' ');
  
      // Extract components: use a regular expression to match date and time
      const match = cleanDateString.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{1,2}:\d{2}\s*[APMapm]+)/);
  
      if (!match) {
        console.log("Invalid Date Format");
        return ''; // Return empty string if format is invalid
      }
  
      const [_, datePart, timePart] = match;
  
      // Parse the date and time explicitly
      const [month, day, year] = datePart.split('/').map(Number);
      const [time, meridian] = timePart.split(' ');
  
      let [hours, minutes] = time.split(':').map(Number);
  
      // Convert to 24-hour format if needed
      if (meridian.toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (meridian.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
  
      // Create a Date object
      const messageDate = new Date(year, month - 1, day, hours, minutes);
  
      console.log("Parsed Date:", messageDate);
  
      // Check if the date is valid
      if (isNaN(messageDate)) {
        console.log("Invalid Date Detected");
        return ''; // Return empty string if date is invalid
      }
  
      // Format based on conditions
      if (isToday(messageDate)) {
        return format(messageDate, 'hh:mm a');
      }
  
      if (isYesterday(messageDate)) {
        return 'Yesterday';
      }
  
      if (isThisWeek(messageDate)) {
        return format(messageDate, 'EEEE');
      }
  
      return format(messageDate, 'dd/MM/yyyy');
    } catch (error) {
      console.error("Error parsing date:", error);
      return ''; // Graceful fallback on error
    }
  };

export const convertTo24HourFormat = (dateStr) => {
    const [date, time, period] = dateStr.split(' ');
    let [hours, minutes] = time.split(':');
    if (period === 'PM' && hours < 12) {
      hours = (parseInt(hours) + 12).toString();
    } else if (period === 'AM' && hours === '12') {
      hours = '00';
    }
    return `${date} ${hours}:${minutes}`;
  };

export const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 9);
  };