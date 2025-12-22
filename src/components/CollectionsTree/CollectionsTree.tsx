import { Tree, Spin } from 'antd'
import { FolderOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { CollectionsTreeProps, Collection } from '../../types'
import styles from './CollectionsTree.module.scss'

export const CollectionsTree: React.FC<CollectionsTreeProps> = ({
  collections,
  selectedCollectionId,
  onSelectCollection,
  loading = false,
}) => {
  // Helper function to find a collection by ID in the tree
  const findCollectionById = (collections: Collection[], id: string): Collection | null => {
    for (const collection of collections) {
      if (collection.id === id) {
        return collection
      }
      if (collection.children) {
        const found = findCollectionById(collection.children, id)
        if (found) {
          return found
        }
      }
    }
    return null
  }

  // Convert collections to Ant Design Tree data format
  const convertToTreeData = (collections: Collection[]): DataNode[] => {
    return collections.map((collection) => {
      const node: DataNode = {
        title: collection.name,
        key: collection.id,
        icon: collection.hasChildren ? <FolderOutlined /> : <FolderOpenOutlined />,
        isLeaf: !collection.hasChildren,
        selectable: !collection.hasChildren, // Only allow selection of collections without children
        className: collection.hasChildren ? 'non-selectable-tree-node' : undefined,
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
      // Only allow selection of collections without children
      const collection = findCollectionById(collections, collectionId)
      if (collection && !collection.hasChildren) {
        onSelectCollection(collectionId)
      }
    } else {
      onSelectCollection(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
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
      className={styles.collectionsTree}
    />
  )
}

