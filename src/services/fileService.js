const fs = require("fs").promises;
const path = require("path");
const { InternalServerError } = require("../utils/errors");

class FileService {
  constructor(dataPath = "./data") {
    this.dataPath = dataPath;
    this.ensureDataDirectory();
  }

  async ensureDataDirectory() {
    try {
      await fs.access(this.dataPath);
    } catch {
      await fs.mkdir(this.dataPath, { recursive: true });
    }
  }

  getFilePath(filename) {
    return path.join(this.dataPath, `${filename}.json`);
  }

  async readFile(filename) {
    try {
      const filePath = this.getFilePath(filename);
      const data = await fs.readFile(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        // File doesn't exist, return empty array
        return [];
      }
      throw new InternalServerError(
        `Failed to read file ${filename}: ${error.message}`,
      );
    }
  }

  async writeFile(filename, data) {
    try {
      const filePath = this.getFilePath(filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
      return true;
    } catch (error) {
      throw new InternalServerError(
        `Failed to write file ${filename}: ${error.message}`,
      );
    }
  }

  async appendToFile(filename, newData) {
    try {
      const existingData = await this.readFile(filename);
      const updatedData = Array.isArray(existingData)
        ? [...existingData, newData]
        : [newData];
      await this.writeFile(filename, updatedData);
      return updatedData;
    } catch (error) {
      throw new InternalServerError(
        `Failed to append to file ${filename}: ${error.message}`,
      );
    }
  }

  async updateInFile(filename, id, updatedData) {
    try {
      const data = await this.readFile(filename);
      const index = data.findIndex((item) => item.id === id);

      if (index === -1) {
        return null;
      }

      data[index] = { ...data[index], ...updatedData, id };
      await this.writeFile(filename, data);
      return data[index];
    } catch (error) {
      throw new InternalServerError(
        `Failed to update file ${filename}: ${error.message}`,
      );
    }
  }

  async deleteFromFile(filename, id) {
    try {
      const data = await this.readFile(filename);
      const filteredData = data.filter((item) => item.id !== id);

      if (filteredData.length === data.length) {
        return null; // Item not found
      }

      await this.writeFile(filename, filteredData);
      return true;
    } catch (error) {
      throw new InternalServerError(
        `Failed to delete from file ${filename}: ${error.message}`,
      );
    }
  }

  async findById(filename, id) {
    try {
      const data = await this.readFile(filename);
      return data.find((item) => item.id === id) || null;
    } catch (error) {
      throw new InternalServerError(
        `Failed to find by ID in file ${filename}: ${error.message}`,
      );
    }
  }

  async findBy(filename, criteria) {
    try {
      const data = await this.readFile(filename);
      return data.filter((item) => {
        return Object.keys(criteria).every(
          (key) => item[key] === criteria[key],
        );
      });
    } catch (error) {
      throw new InternalServerError(
        `Failed to find by criteria in file ${filename}: ${error.message}`,
      );
    }
  }
}

module.exports = new FileService(process.env.DATA_PATH || "./data");
