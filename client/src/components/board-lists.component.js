import React, { useContext, useState } from 'react';
import { ObjectID } from 'bson';
import { useParams } from 'react-router-dom';
import { SocketContext } from '../context/SocketContext';
import { BoardContext } from '../context/BoardContext';
import BoardListNameForm from './board-list-name-form.component';
import BoardListContainer from './board-list-container.component';
import './board-lists.styles.scss';

const BoardLists = () => {
  const socket = useContext(SocketContext)
  const { projectId } = useParams();
  const { boardState, addList } = useContext(BoardContext);
  const { currentProject } = boardState;
  const [showListAdd, setShowListAdd] = useState(false);

  const handleAddSubmit = (listName = '') => {
    if (listName.length > 0) {
      const newList = {
        _id: new ObjectID().toString(),
        name: listName,
        project: projectId,
        tasks: [],
      };
      socket.emit('add_list', newList);
      addList(newList);
    }

    setShowListAdd(false);
  }

  return (
    <React.Fragment>
      <div className='board-lists'>
        {
          currentProject && currentProject.lists && currentProject.lists.length > 0 &&
          currentProject.lists.map(listId => {
            return (
              <BoardListContainer key={listId} listId={listId} />
            );
          })
        }
      </div>

      {
        showListAdd ?
          <BoardListNameForm submit={handleAddSubmit} dismiss={() => setShowListAdd(false)} />
          :
          <button className='add-list' onClick={() => setShowListAdd(true)}>
            Add new list
          </button>
      }
    </React.Fragment>
  );
}

export default BoardLists;