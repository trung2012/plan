require('./db/mongoose');
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIO = require('socket.io');
const socketioJwt = require('socketio-jwt');

const userRouter = require('./routers/api/user');
const projectRouter = require('./routers/api/project');

const List = require('./models/List');
const Project = require('./models/Project');
const Task = require('./models/Task');
const convertArrayToMap = require('./utils/convertArrayToMap');

const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());

app.use('/api/users', userRouter);
app.use('/api/projects', projectRouter);

const io = socketIO(server);

////////////////////////////
//Socket operations

io.use(socketioJwt.authorize({
  secret: process.env.JWT_SECRET,
  handshake: true
}));

io.on('connection', (socket) => {
  console.log(socket.decoded_token.id, ' connected');

  socket.on('join', (projectId) => {
    socket.join(projectId);
    console.log(`joined project ${projectId}`)
  })

  socket.on('initial_data', async projectId => {
    try {

      const [project, lists, tasks] = await Promise.all([
        Project.findById(projectId).lean().populate({
          path: 'members',
          select: '-password'
        }),
        List.find({ project: projectId }).lean(),
        Task.find({ project: projectId }).lean().populate({
          path: 'assignee',
          select: '-password'
        })
      ])

      const memberIds = project.members.map(member => member._id)

      const listsMap = convertArrayToMap(lists);

      const tasksMap = convertArrayToMap(tasks)

      const data = {
        currentProject: {
          ...project,
          members: []
        },
        lists: listsMap,
        tasks: tasksMap,
        members: project.members,
        memberIds
      };

      socket.emit('data_updated', data);
    } catch (err) {
      console.log(err)
      socket.emit('new_error', 'Error loading data. Please try again');
    }
  })

  socket.on('add_member', async ({ user, projectId }) => {
    try {
      await Project.updateOne(
        { _id: projectId },
        { $push: { members: user._id } }
      );

      io.in(projectId).emit('member_added', user);
    } catch (err) {
      console.log(err)
      socket.emit('new_error', 'Error adding project member. Please try again');
    }
  })

  socket.on('delete_member', async ({ _id, projectId }) => {
    try {
      await Project.updateOne(
        { _id: projectId },
        { $pull: { members: _id } }
      );

      io.in(projectId).emit('member_deleted', _id);
    } catch (err) {
      console.log(err)
      socket.emit('new_error', 'Error deleting project member. Please try again');
    }
  })

  socket.on('add_list', async (listData) => {
    try {
      const newList = new List(listData);

      await newList.save();

      await Project.updateOne(
        { _id: listData.project },
        { $push: { lists: newList._id } }
      );

      socket.to(listData.project).emit('list_added', newList);
    } catch (err) {
      console.log(err)
      socket.emit('new_error', 'Error adding list. Please try again');
    }
  })

  socket.on('delete_list', async ({ listId, projectId }) => {
    try {
      const list = await List.findById(listId);

      await list.remove();

      socket.to(projectId).emit('list_deleted', list);
    } catch (err) {
      console.log(err)
      socket.emit('new_error', 'Error deleting list. Please try again');
    }
  })

  socket.on('edit_list_name', async ({ listId, listName, projectId }) => {
    try {
      const list = await List.findById(listId);
      list.name = listName;
      await list.save();

      socket.to(projectId).emit('list_name_updated', list);
    } catch (err) {
      socket.emit('new_error', 'Error updating list name');
    }
  })

  socket.on('add_task', async ({ taskData, projectId }) => {
    try {
      const newTask = new Task({
        ...taskData,
        project: projectId
      })

      await newTask.save();
      await List.updateOne(
        { _id: newTask.list },
        { $push: { tasks: newTask._id } },
        { new: true }
      )

      const task = await Task.findById(newTask._id).populate('assignee');

      socket.to(projectId).emit('task_added', task);
    } catch (err) {
      console.log(err)
      socket.emit('new_error', 'Error adding task');
    }
  })

  socket.on('delete_task', async ({ taskId, projectId }) => {
    try {
      const task = await Task.findById(taskId);
      await task.remove();

      socket.to(projectId).emit('task_deleted', task);
    } catch (err) {
      console.log(err)
      socket.emit('new_error', 'Error deleting task');
    }
  })

  socket.on('leave', (projectId) => {
    socket.leave(projectId);
    console.log(`left project ${projectId}`)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected');
  })
});

////////////////////////////

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
