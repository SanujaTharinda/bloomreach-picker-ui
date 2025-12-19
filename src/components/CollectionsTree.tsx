import { Tree, Spin } from 'antd'
import { FolderOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { CollectionsTreeProps, Collection } from '../types'
import '../styles/CollectionsTree.scss'

export const CollectionsTree: React.FC<CollectionsTreeProps> = ({
  collections,
  selectedCollectionId,
  onSelectCollection,
  loading = false,
}) => {
  // Convert collections to Ant Design Tree data format
  const convertToTreeData = (collections: Collection[]): DataNode[] => {
    return collections.map((collection) => {
      const node: DataNode = {
        title: collection.name,
        key: collection.id,
        icon: collection.hasChildren ? <FolderOutlined /> : <FolderOpenOutlined />,
        isLeaf: !collection.hasChildren,
      }

      if (collection.children && collection.children.length > 0) {
        node.children = convertToTreeData(collection.children)
      }

      return node
    })
  }

  const treeData = convertToTreeData(collections)

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const collectionId = selectedKeys[0] as string
      onSelectCollection(collectionId)
    }
  }

  if (loading) {
    return (
      <div className="collections-tree__loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Tree
      showIcon
      defaultExpandAll={false}
      defaultExpandedKeys={['root']}
      selectedKeys={selectedCollectionId ? [selectedCollectionId] : []}
      treeData={treeData}
      onSelect={handleSelect}
      className="collections-tree"
    />
  )
}

