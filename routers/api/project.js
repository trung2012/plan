const express = require('express')
const auth = require('../../middleware/auth');
const router = new express.Router();

const Project = require('../../models/Project');
const getRandomColor = require('../../utils/getRandomColor')

// Create new project
router.post('/create', auth, async (req, res) => {
  try {
    if (req.user) {
      const { name, description } = req.body;

      const existingProject = await Project.findOne({ name })

      if (existingProject) {
        return res.status(400).send('A project with the same name already exists');
      }

      const newProject = new Project({
        name,
        description,
        owner: req.user._id,
        members: [req.user._id],
        color: getRandomColor()
      })

      const project = await newProject.save();

      req.user.projects.push(project._id);
      await req.user.save();

      res.status(201).send(project)
    }
  } catch (err) {
    res.status(500).send('Internal Server Error. Please try again')
  }
})

router.get('/all', auth, async (req, res) => {
  try {
    if (req.user) {
      const { user } = req;

      await user.populate('projects').execPopulate();

      res.send(user.projects);
    }
  } catch (err) {
    res.status(500).send('Internal Server Error. Please try again')
  }
})

router.delete('/', auth, async (req, res) => {
  try {
    const { _id } = req.body;
    const project = await Project.findById(_id.toString())

    if (!project) {
      return res.status(404).send('Project not found')
    }

    if (req.user && req.user._id.toString() === project.owner.toString()) {
      const deleted = await project.remove();

      return res.send(deleted);
    } else {
      res.status(401).send('Not Authorized')
    }
  } catch (err) {
    res.status(500).send('Internal Server Error. Please try again')
  }
})

module.exports = router;