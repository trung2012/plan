import React, { useContext, useEffect, useState } from 'react';


import { ProjectContext } from '../context/ProjectContext';
import ProjectList from './project-list.component';
import Modal from './modal.component';
import Spinner from './spinner.component';
import ProjectAddForm from './project-add-form.component';
import CustomButton from './custom-button.component';

import './project-overview.styles.scss';

const ProjectOverview = () => {
  const { projectState, fetchProjects } = useContext(ProjectContext);
  const { projects, isLoading } = projectState;
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects])

  return (
    isLoading ? <Spinner />
      :
      <div className='project-overview'>
        {
          showCreateProjectModal &&
          <Modal
            modalTitle='Create project'
            dismiss={() => setShowCreateProjectModal(false)}
            confirmText='Create'
          >
            <ProjectAddForm dismiss={() => setShowCreateProjectModal(false)} />
          </Modal>
        }
        <div className='project-overview__header'>
          <h1 className='project-overview__heading'>Your projects</h1>
          <CustomButton text='New project' onClick={() => setShowCreateProjectModal(true)} />
        </div>
        <ProjectList projects={projects} />
      </div>
  );
}

export default ProjectOverview;